import Foundation
import Cocoa
import UserNotifications
import os

private let logger = Logger(subsystem: "com.vibetuto.recorder", category: "SessionManager")

/// Singleton that manages the recording session lifecycle.
@MainActor
final class SessionManager: ObservableObject {
    static let shared = SessionManager()

    @Published var state: RecordingState = .idle
    @Published var elapsedTime: TimeInterval = 0
    @Published var stepCount: Int = 0
    @Published var currentMode: RecordingMode = .fullScreen
    @Published var micEnabled: Bool = true
    @Published var actionDetectionEnabled: Bool = true
    @Published private(set) var lastTutorialID: String?

    private var recordingStartTime: Date?
    private var timer: Timer?
    private var detectedSteps: [DetectedStep] = []
    private var screenshotFiles: [String: URL] = [:]
    private var appsUsed: Set<String> = []
    private var sessionID: UUID?
    private var audioURL: URL?

    private let captureEngine = CaptureEngine()
    private let frameProcessor = FrameProcessor()
    private let eventMonitor = EventMonitor()
    private let stepDetector = StepDetector()
    private let actionBuffer: ActionBuffer
    private let contextTracker = ContextTracker()
    private let audioRecorder = AudioRecorder()
    private let localStore = LocalStore()
    private lazy var supabaseClient: SupabaseClient = {
        let baseURLString = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
        let apiKey = UserDefaults.standard.string(forKey: "supabaseApiKey") ?? ""
        return SupabaseClient(baseURL: URL(string: baseURLString)!, apiKey: apiKey)
    }()
    private lazy var uploadManager: UploadManager = {
        UploadManager(supabaseClient: supabaseClient)
    }()

    private init() {
        actionBuffer = ActionBuffer(stepDetector: stepDetector)
    }

    /// Start a recording session with optional countdown.
    func startRecording(countdown: Int = 3) {
        guard case .idle = state else { return }

        // Check screen recording permission before starting
        if !CGPreflightScreenCaptureAccess() {
            state = .error("Screen Recording permission required. Open System Settings > Privacy & Security > Screen Recording and enable VibeTuto.")
            if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
                NSWorkspace.shared.open(url)
            }
            return
        }

        sessionID = UUID()
        detectedSteps = []
        screenshotFiles = [:]
        appsUsed = []
        stepCount = 0
        elapsedTime = 0

        if countdown > 0 {
            state = .countdown(remaining: countdown)
            runCountdown(from: countdown)
        } else {
            beginCapture()
        }
    }

    private func runCountdown(from count: Int) {
        var remaining = count
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            Task { @MainActor in
                guard let self else {
                    timer.invalidate()
                    return
                }
                remaining -= 1
                if remaining <= 0 {
                    timer.invalidate()
                    self.beginCapture()
                } else {
                    self.state = .countdown(remaining: remaining)
                }
            }
        }
    }

    private func beginCapture() {
        state = .recording
        let sessionStart = Date()
        recordingStartTime = sessionStart
        stepDetector.reset()
        actionBuffer.reset()
        contextTracker.reset()

        // Start elapsed timer
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, let start = self.recordingStartTime else { return }
                self.elapsedTime = Date().timeIntervalSince(start)
            }
        }

        // Start screen capture
        Task {
            do {
                try await captureEngine.startCapture(mode: currentMode, appBundleID: nil)
            } catch {
                state = .error("Failed to start capture: \(error.localizedDescription)")
                return
            }
        }

        // Wire up the step detection pipeline:
        // EventMonitor -> ActionBuffer -> StepDetector -> captureStepScreenshot
        guard actionDetectionEnabled else { return }

        actionBuffer.onStepDetected = { [weak self] step in
            Task { @MainActor [weak self] in
                guard let self else { return }
                await self.captureStepScreenshot(
                    actionType: step.actionType,
                    caption: step.autoCaption,
                    appBundleID: step.appBundleID,
                    appName: step.appName,
                    clickX: step.clickX,
                    clickY: step.clickY,
                    elementInfo: step.elementInfo,
                    url: step.url,
                    windowTitle: step.windowTitle
                )
            }
        }

        eventMonitor.start(sessionStart: sessionStart) { [weak self] action in
            self?.actionBuffer.addAction(action)
        }

        // Start audio capture if mic is enabled
        if micEnabled {
            let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent("VibeTuto/\(sessionID?.uuidString ?? UUID().uuidString)")
            try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
            try? audioRecorder.start(outputDirectory: tempDir)
        }
    }

    /// Pause the recording.
    func pauseRecording() {
        guard case .recording = state else { return }
        state = .paused
        timer?.invalidate()
        timer = nil
    }

    /// Resume a paused recording.
    func resumeRecording() {
        guard case .paused = state else { return }
        state = .recording
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, let start = self.recordingStartTime else { return }
                self.elapsedTime = Date().timeIntervalSince(start)
            }
        }
    }

    /// Add a manual marker step.
    func addMarker() {
        guard case .recording = state else { return }
        Task {
            await captureStepScreenshot(actionType: .manualMarker, caption: "Manual marker")
        }
    }

    /// Stop recording and begin upload.
    func stopRecording() {
        // Allow stopping from both recording and paused states
        switch state {
        case .recording, .paused:
            break
        default:
            return
        }

        state = .stopping
        timer?.invalidate()
        timer = nil

        // Stop all monitors
        eventMonitor.stop()
        self.audioURL = audioRecorder.stop()

        Task {
            do {
                try await captureEngine.stopCapture()
            } catch {
                print("[SessionManager] Error stopping capture: \(error)")
            }

            // Save locally first before attempting upload
            if let sessionID {
                let screenSize = NSScreen.main?.frame.size ?? CGSize(width: 2560, height: 1600)
                let session = RecordingSession(
                    id: sessionID,
                    startedAt: recordingStartTime ?? Date(),
                    duration: elapsedTime,
                    macosVersion: ProcessInfo.processInfo.operatingSystemVersionString,
                    screenResolution: "\(Int(screenSize.width))x\(Int(screenSize.height))",
                    appsUsed: contextTracker.allAppsUsed,
                    steps: detectedSteps,
                    audioKey: self.audioURL != nil ? "narration.m4a" : nil
                )
                var screenshotData: [String: Data] = [:]
                for (key, url) in screenshotFiles {
                    if let data = try? Data(contentsOf: url) {
                        screenshotData[key] = data
                    }
                }
                _ = try? localStore.saveSession(session, screenshots: screenshotData)
            }

            await beginUpload()
        }
    }

    /// Handle app switch event from AppDelegate.
    nonisolated func handleAppSwitch(bundleID: String, name: String) {
        Task { @MainActor in
            guard case .recording = state else { return }
            appsUsed.insert(bundleID)
            await captureStepScreenshot(
                actionType: .appSwitch,
                caption: "Switch to \(name)",
                appBundleID: bundleID,
                appName: name
            )
        }
    }

    /// Capture a screenshot and add it as a detected step.
    func captureStepScreenshot(
        actionType: ActionType,
        caption: String,
        appBundleID: String? = nil,
        appName: String? = nil,
        clickX: CGFloat? = nil,
        clickY: CGFloat? = nil,
        elementInfo: ElementInfo? = nil,
        url: String? = nil,
        windowTitle: String? = nil
    ) async {
        do {
            let image = try await captureEngine.takeScreenshot()
            guard let data = frameProcessor.compressScreenshot(image) else { return }

            let stepIndex = detectedSteps.count
            let screenshotKey = "\(sessionID?.uuidString ?? "unknown")/step-\(stepIndex).jpg"
            let fileURL = try frameProcessor.saveToTemporaryFile(data, filename: "step-\(stepIndex).jpg")
            screenshotFiles[screenshotKey] = fileURL

            let screenSize = NSScreen.main?.frame.size ?? CGSize(width: 2560, height: 1600)

            let step = DetectedStep(
                orderIndex: stepIndex,
                timestamp: elapsedTime,
                actionType: actionType,
                screenshotKey: screenshotKey,
                clickX: clickX,
                clickY: clickY,
                viewportWidth: Int(screenSize.width),
                viewportHeight: Int(screenSize.height),
                appBundleID: appBundleID,
                appName: appName,
                windowTitle: windowTitle,
                url: url,
                elementInfo: elementInfo,
                autoCaption: caption
            )

            detectedSteps.append(step)
            stepCount = detectedSteps.count
        } catch {
            print("[SessionManager] Failed to capture step screenshot: \(error)")
        }
    }

    private func beginUpload() async {
        // Load auth token before uploading
        guard supabaseClient.loadStoredToken() else {
            logger.error("No API token found in UserDefaults")
            state = .error("No API token configured. Open Preferences to add your token.")
            return
        }
        logger.info("Token loaded successfully")

        state = .uploading(progress: 0)

        let screenSize = NSScreen.main?.frame.size ?? CGSize(width: 2560, height: 1600)

        let metadata = RecordingMetadata(
            duration: elapsedTime,
            startedAt: ISO8601DateFormatter().string(from: recordingStartTime ?? Date()),
            macosVersion: ProcessInfo.processInfo.operatingSystemVersionString,
            screenResolution: "\(Int(screenSize.width))x\(Int(screenSize.height))",
            appsUsed: Array(appsUsed)
        )

        uploadManager.onProgress = { [weak self] progress in
            Task { @MainActor in
                self?.state = .uploading(progress: progress)
            }
        }

        logger.info("Starting upload with \(self.detectedSteps.count) steps, \(self.screenshotFiles.count) screenshots")
        logger.info("Base URL: \(UserDefaults.standard.string(forKey: "apiBaseURL") ?? "default")")
        logger.info("Has token: \(self.supabaseClient.isAuthenticated)")

        do {
            let tutorialID = try await uploadManager.uploadSession(
                steps: detectedSteps,
                screenshotFiles: screenshotFiles,
                audioFile: self.audioURL,
                metadata: metadata
            )
            lastTutorialID = tutorialID
            state = .completed
            logger.info("Upload completed! Tutorial ID: \(tutorialID)")

            // Send notification
            sendUploadCompleteNotification()
        } catch {
            logger.error("Upload failed: \(error.localizedDescription)")
            state = .error("Upload failed: \(error.localizedDescription)")
        }
    }

    /// Get the tutorial URL to open in browser after successful upload.
    var tutorialEditorURL: URL? {
        guard let tutorialID = lastTutorialID else { return nil }
        let baseURL = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
        return URL(string: "\(baseURL)/editor/\(tutorialID)?source=desktop")
    }

    private func sendUploadCompleteNotification() {
        let content = UNMutableNotificationContent()
        content.title = "Tutorial uploaded!"
        content.body = "Click to open in editor."
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                print("[SessionManager] Failed to send notification: \(error)")
            }
        }
    }

    /// Reset session state back to idle.
    func reset() {
        state = .idle
        elapsedTime = 0
        stepCount = 0
        detectedSteps = []
        screenshotFiles = [:]
        appsUsed = []
        sessionID = nil
        audioURL = nil
        lastTutorialID = nil
        eventMonitor.stop()
        _ = audioRecorder.stop()
        stepDetector.reset()
        actionBuffer.reset()
        contextTracker.reset()
    }
}
