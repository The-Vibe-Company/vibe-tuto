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
    @Published var selectedAppBundleID: String?
    @Published var selectedRegion: CGRect?
    @Published var micEnabled: Bool = true
    @Published var actionDetectionEnabled: Bool = true
    @Published private(set) var lastTutorialID: String?

    private var recordingStartTime: Date?
    private var timeline: RecordingTimeline?
    var canRetryUpload: Bool { !detectedSteps.isEmpty }
    private var timer: Timer?
    private var detectedSteps: [DetectedStep] = []
    private var screenshotFiles: [String: URL] = [:]
    private var appsUsed: Set<String> = []
    private var sessionID: UUID?
    private var audioURL: URL?
    private var activeScreenshots = 0
    private var persistedDirectory: URL?
    @Published var pendingRecordingCount = 0

    private let captureEngine = CaptureEngine()
    private let frameProcessor = FrameProcessor()
    private let eventMonitor = EventMonitor()
    private let stepDetector = StepDetector()
    private let actionBuffer: ActionBuffer
    private let contextTracker = ContextTracker()
    private let audioRecorder = AudioRecorder()
    private let localStore = LocalStore()
    private var supabaseClient: SupabaseClient {
        let value = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
        let apiKey = UserDefaults.standard.string(forKey: "supabaseApiKey") ?? ""
        return SupabaseClient(baseURL: URL(string: value) ?? URL(string: "https://captuto.com")!, apiKey: apiKey)
    }

    var currentCaptureArea: CaptureGeometry.CaptureArea {
        captureEngine.captureArea
    }

    private init() {
        actionBuffer = ActionBuffer(stepDetector: stepDetector)
        pendingRecordingCount = localStore.pendingSessions().count
    }

    /// Start a recording session with optional countdown.
    func startRecording(countdown: Int? = nil) {
        guard case .idle = state else { return }

        // Check screen recording permission before starting
        if !CGPreflightScreenCaptureAccess() {
            state = .error("Screen Recording permission required. Open System Settings > Privacy & Security > Screen Recording and enable VibeTuto.")
            if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
                NSWorkspace.shared.open(url)
            }
            return
        }

        lastTutorialID = nil
        persistedDirectory = nil
        sessionID = UUID()
        detectedSteps = []
        screenshotFiles = [:]
        appsUsed = []
        stepCount = 0
        elapsedTime = 0

        if currentMode == .region && selectedRegion == nil {
            state = .selectingRegion
            return
        }

        let countdown = countdown ?? (UserDefaults.standard.object(forKey: "showCountdown") as? Bool == false ? 0 : (UserDefaults.standard.object(forKey: "countdownDuration") as? Int ?? 3))
        if countdown > 0 {
            state = .countdown(remaining: countdown)
            runCountdown(from: countdown)
        } else {
            beginCapture()
        }
    }

    /// Called after the user selects a region via the overlay.
    func regionSelected(rect: CGRect) {
        guard case .selectingRegion = state else { return }
        selectedRegion = rect
        state = .countdown(remaining: 3)
        runCountdown(from: 3)
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
        let sessionStart = Date()

        // Wire the step detection callback before events start arriving.
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

        Task {
            do {
                let bundleID: String? = currentMode == .singleApp
                    ? selectedAppBundleID
                    : nil
                try await captureEngine.startCapture(mode: currentMode, appBundleID: bundleID, regionRect: selectedRegion)
            } catch {
                timer?.invalidate()
                timer = nil
                eventMonitor.stop()
                _ = audioRecorder.stop()
                state = .error("Failed to start capture: \(error.localizedDescription)")
                return
            }

            do {
                try startAudioIfNeeded()
            } catch {
                try? await captureEngine.stopCapture()
                state = .error("Microphone could not start: \(error.localizedDescription)")
                return
            }

            state = .recording
            recordingStartTime = sessionStart
            timeline = RecordingTimeline(startedAt: sessionStart)
            stepDetector.reset()
            actionBuffer.reset()
            contextTracker.reset()

            timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
                Task { @MainActor in
                    guard let self else { return }
                    self.elapsedTime = self.timeline?.elapsed(at: Date()) ?? 0
                }
            }

            guard actionDetectionEnabled else { return }
            eventMonitor.start(sessionStart: sessionStart, captureArea: captureEngine.captureArea) { [weak self] action in
                self?.actionBuffer.addAction(action)
            }
        }
    }

    private func startAudioIfNeeded() throws {
        guard micEnabled else { return }
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("VibeTuto/\(sessionID?.uuidString ?? UUID().uuidString)")
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        try audioRecorder.start(outputDirectory: tempDir)
    }

    /// Pause the recording.
    func pauseRecording() {
        guard case .recording = state else { return }
        timeline?.pause(at: Date())
        elapsedTime = timeline?.elapsed(at: Date()) ?? elapsedTime
        state = .paused
        timer?.invalidate()
        timer = nil
        eventMonitor.stop()
        audioRecorder.pause()
    }

    /// Resume a paused recording.
    func resumeRecording() {
        guard case .paused = state else { return }
        timeline?.resume(at: Date())
        state = .recording
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                self.elapsedTime = self.timeline?.elapsed(at: Date()) ?? 0
            }
        }
        if actionDetectionEnabled {
            let activeElapsed = timeline?.elapsed(at: Date()) ?? elapsedTime
            eventMonitor.start(
                sessionStart: Date().addingTimeInterval(-activeElapsed),
                captureArea: captureEngine.captureArea
            ) { [weak self] action in
                self?.actionBuffer.addAction(action)
            }
        }
        audioRecorder.resume()
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

        elapsedTime = timeline?.elapsed(at: Date()) ?? elapsedTime
        state = .stopping
        timer?.invalidate()
        timer = nil

        // Stop all monitors
        eventMonitor.stop()
        self.audioURL = audioRecorder.stop()

        Task {
            while activeScreenshots > 0 {
                try? await Task.sleep(for: .milliseconds(10))
            }
            do {
                try await captureEngine.stopCapture()
            } catch {
                print("[SessionManager] Error stopping capture: \(error)")
            }

            // Save locally first before attempting upload
            if let sessionID {
                let captureArea = self.captureEngine.captureArea
                let session = RecordingSession(
                    id: sessionID,
                    startedAt: recordingStartTime ?? Date(),
                    duration: elapsedTime,
                    macosVersion: ProcessInfo.processInfo.operatingSystemVersionString,
                    screenResolution: captureArea.resolutionString,
                    appsUsed: Array(appsUsed),
                    steps: detectedSteps,
                    audioKey: self.audioURL != nil ? "narration.m4a" : nil
                )
                var screenshotData: [String: Data] = [:]
                for (key, url) in screenshotFiles {
                    if let data = try? Data(contentsOf: url) {
                        screenshotData[key] = data
                    }
                }
                do {
                    persistedDirectory = try localStore.saveSession(session, screenshots: screenshotData, audioFile: audioURL)
                    pendingRecordingCount = localStore.pendingSessions().count
                } catch {
                    state = .error("Recording could not be saved locally: \(error.localizedDescription)")
                    return
                }
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
        guard state == .recording else { return }
        let captureTimestamp = timeline?.elapsed(at: Date()) ?? elapsedTime
        activeScreenshots += 1
        defer { activeScreenshots -= 1 }
        do {
            let image = try await captureEngine.takeScreenshot()
            guard let data = frameProcessor.compressScreenshot(image) else { return }

            let stepIndex = detectedSteps.count
            let screenshotKey = "\(sessionID?.uuidString ?? "unknown")/step-\(stepIndex).jpg"
            let fileURL = try frameProcessor.saveToTemporaryFile(data, filename: "\(sessionID?.uuidString ?? "unknown")-step-\(stepIndex).jpg")
            screenshotFiles[screenshotKey] = fileURL

            let captureArea = captureEngine.captureArea
            let step = DetectedStep(
                orderIndex: stepIndex,
                timestamp: captureTimestamp,
                actionType: actionType,
                screenshotKey: screenshotKey,
                clickX: clickX,
                clickY: clickY,
                viewportWidth: captureArea.pixelWidth,
                viewportHeight: captureArea.pixelHeight,
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
        let supabaseClient = self.supabaseClient
        let uploadManager = UploadManager(supabaseClient: supabaseClient)
        // Load auth token before uploading
        guard supabaseClient.loadStoredToken() else {
            logger.error("No API token found in UserDefaults")
            state = .error("No API token configured. Open Preferences to add your token.")
            return
        }
        logger.info("Token loaded successfully")

        state = .uploading(progress: 0)

        let captureArea = captureEngine.captureArea

        let metadata = RecordingMetadata(
            clientID: sessionID?.uuidString,
            duration: elapsedTime,
            startedAt: ISO8601DateFormatter().string(from: recordingStartTime ?? Date()),
            macosVersion: ProcessInfo.processInfo.operatingSystemVersionString,
            screenResolution: captureArea.resolutionString,
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
                metadata: metadata,
                existingTutorialID: lastTutorialID,
                onCreated: { [self] id in
                    lastTutorialID = id
                    if let persistedDirectory {
                        try Data(id.utf8).write(to: persistedDirectory.appendingPathComponent("tutorial-id"), options: .atomic)
                    }
                }
            )
            lastTutorialID = tutorialID
            storeRecentRecording(tutorialID: tutorialID)
            if let persistedDirectory {
                try localStore.removeSession(at: persistedDirectory)
                self.persistedDirectory = nil
            }
            pendingRecordingCount = localStore.pendingSessions().count
            state = .completed
            logger.info("Upload completed! Tutorial ID: \(tutorialID)")

            // Send notification
            sendUploadCompleteNotification()
            if UserDefaults.standard.bool(forKey: "autoOpenEditor"), let url = tutorialEditorURL {
                NSWorkspace.shared.open(url)
            }
        } catch {
            logger.error("Upload failed: \(error.localizedDescription)")
            state = .error("Upload failed: \(error.localizedDescription)")
        }
    }

    /// Restore the oldest durable recording, including narration, after relaunch.
    func resumePendingUpload() {
        guard case .idle = state else { return }
        guard let directory = localStore.pendingSessions().sorted(by: { $0.lastPathComponent < $1.lastPathComponent }).first else { return }
        do {
            let saved = try localStore.loadSession(at: directory)
            sessionID = saved.id
            persistedDirectory = directory
            recordingStartTime = saved.startedAt
            elapsedTime = saved.duration
            detectedSteps = saved.steps
            stepCount = saved.steps.count
            appsUsed = Set(saved.appsUsed)
            screenshotFiles = localStore.screenshotFiles(for: saved, at: directory)
            audioURL = localStore.audioFile(for: saved, at: directory)
            lastTutorialID = try? String(contentsOf: directory.appendingPathComponent("tutorial-id"), encoding: .utf8)
            Task { await beginUpload() }
        } catch {
            state = .error("Saved recording could not be restored: \(error.localizedDescription)")
        }
    }

    /// Retry a failed upload without re-recording.
    func retryUpload() {
        guard case .error = state, canRetryUpload else { return }
        Task {
            await beginUpload()
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

    private func storeRecentRecording(tutorialID: String) {
        var recordings = UserDefaults.standard.array(forKey: "recentRecordings") as? [[String: String]] ?? []
        recordings.removeAll { $0["id"] == tutorialID }
        recordings.insert(
            [
                "id": tutorialID,
                "title": "Desktop Recording",
                "created_at": ISO8601DateFormatter().string(from: Date()),
            ],
            at: 0
        )
        UserDefaults.standard.set(Array(recordings.prefix(5)), forKey: "recentRecordings")
    }

    /// Reset session state back to idle.
    func reset() {
        state = .idle
        elapsedTime = 0
        timeline = nil
        stepCount = 0
        detectedSteps = []
        screenshotFiles = [:]
        appsUsed = []
        sessionID = nil
        audioURL = nil
        lastTutorialID = nil
        persistedDirectory = nil
        pendingRecordingCount = localStore.pendingSessions().count
        selectedRegion = nil
        eventMonitor.stop()
        _ = audioRecorder.stop()
        stepDetector.reset()
        actionBuffer.reset()
        contextTracker.reset()
    }

    /// Retry locally persisted sessions from previous failed/offline uploads.
    func retryPendingUploadsSilently() {
        guard supabaseClient.loadStoredToken() else { return }
        let pending = localStore.pendingSessions()
        guard !pending.isEmpty else { return }

        Task {
            for directory in pending {
                do {
                    let session = try localStore.loadSession(at: directory)
                    let tutorialID = try? String(contentsOf: directory.appendingPathComponent("tutorial-id"), encoding: .utf8)
                    let metadata = RecordingMetadata(
                        clientID: session.id.uuidString,
                        duration: session.duration,
                        startedAt: ISO8601DateFormatter().string(from: session.startedAt),
                        macosVersion: session.macosVersion,
                        screenResolution: session.screenResolution,
                        appsUsed: session.appsUsed
                    )
                    let uploadManager = UploadManager(supabaseClient: self.supabaseClient)
                    _ = try await uploadManager.uploadSession(
                        steps: session.steps,
                        screenshotFiles: localStore.screenshotFiles(for: session, at: directory),
                        audioFile: localStore.audioFile(for: session, at: directory),
                        metadata: metadata,
                        existingTutorialID: tutorialID,
                        onCreated: { id in
                            try Data(id.utf8).write(to: directory.appendingPathComponent("tutorial-id"), options: .atomic)
                        }
                    )
                    try? localStore.removeSession(at: directory)
                    pendingRecordingCount = localStore.pendingSessions().count
                } catch {
                    logger.error("Pending upload retry failed: \(error.localizedDescription)")
                }
            }
        }
    }
}
