import Foundation
import ScreenCaptureKit
import CoreGraphics
import CoreMedia

/// Protocol for capture engine implementations.
protocol CaptureEngineProtocol: AnyObject, Sendable {
    func startCapture(mode: RecordingMode, appBundleID: String?, regionRect: CGRect?) async throws
    func stopCapture() async throws
    func takeScreenshot() async throws -> CGImage
}

/// Wraps ScreenCaptureKit to capture screen content.
final class CaptureEngine: NSObject, CaptureEngineProtocol, @unchecked Sendable {
    private var stream: SCStream?
    private var streamOutput: CaptureStreamOutput?
    private let captureQueue = DispatchQueue(label: "com.vibetuto.capture", qos: .userInteractive)
    private var currentFilter: SCContentFilter?
    private var currentSourceRect: CGRect?
    private var currentCaptureArea = CaptureGeometry.CaptureArea(
        frame: CGRect(x: 0, y: 0, width: 2560, height: 1600),
        visibleFrame: CGRect(x: 0, y: 0, width: 2560, height: 1560),
        scale: 1,
        displayID: nil
    )
    private var isCapturing = false

    var captureArea: CaptureGeometry.CaptureArea {
        currentCaptureArea
    }

    /// Check if screen recording permission is granted.
    static func checkPermission() async -> PermissionStatus {
        do {
            // Attempting to get shareable content will prompt for permission if not granted.
            _ = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            return .granted
        } catch {
            let nsError = error as NSError
            if nsError.domain == "com.apple.screencapturekit" && nsError.code == -3801 {
                return .denied
            }
            return .notDetermined
        }
    }

    func startCapture(mode: RecordingMode, appBundleID: String? = nil, regionRect: CGRect? = nil) async throws {
        guard !isCapturing else { return }

        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
        let snapshots = await MainActor.run {
            CaptureGeometry.snapshots(from: NSScreen.screens)
        }
        let mouseLocation = await MainActor.run { NSEvent.mouseLocation }
        let area = CaptureGeometry.area(
            for: mode,
            region: regionRect,
            mouseLocation: mouseLocation,
            screens: snapshots
        )
        let targetDisplay = display(
            matching: area.displayID,
            in: content.displays
        ) ?? content.displays.first
        guard let display = targetDisplay else {
            throw CaptureError.noDisplayFound
        }

        let targetScreenFrame = snapshots.first(where: { $0.displayID == area.displayID })?.frame ?? area.frame

        let filter: SCContentFilter
        switch mode {
        case .fullScreen:
            filter = SCContentFilter(display: display, excludingWindows: [])

        case .singleApp:
            guard let bundleID = appBundleID,
                  let app = content.applications.first(where: { $0.bundleIdentifier == bundleID }) else {
                throw CaptureError.applicationNotFound
            }
            filter = SCContentFilter(display: display, including: [app], exceptingWindows: [])

        case .region:
            filter = SCContentFilter(display: display, excludingWindows: [])
        }

        currentFilter = filter
        currentCaptureArea = area
        currentSourceRect = (mode == .region)
            ? CaptureGeometry.rectRelativeToScreen(area.frame, screenFrame: targetScreenFrame)
            : nil

        let config = SCStreamConfiguration()
        if let sourceRect = currentSourceRect {
            config.sourceRect = sourceRect
            config.width = area.pixelWidth
            config.height = area.pixelHeight
            config.destinationRect = CGRect(origin: .zero, size: area.frame.size)
        } else {
            config.width = display.width
            config.height = display.height
        }
        config.minimumFrameInterval = CMTime(value: 1, timescale: 2) // 2 fps background capture
        config.queueDepth = 5
        config.showsCursor = true
        config.pixelFormat = kCVPixelFormatType_32BGRA

        let output = CaptureStreamOutput()
        streamOutput = output

        let stream = SCStream(filter: filter, configuration: config, delegate: output)
        try stream.addStreamOutput(output, type: .screen, sampleHandlerQueue: captureQueue)
        try await stream.startCapture()

        self.stream = stream
        isCapturing = true
    }

    func stopCapture() async throws {
        guard isCapturing, let stream = stream else { return }
        try await stream.stopCapture()
        self.stream = nil
        self.streamOutput = nil
        self.currentSourceRect = nil
        isCapturing = false
    }

    /// Takes a high-resolution screenshot of the current content.
    func takeScreenshot() async throws -> CGImage {
        guard let filter = currentFilter else {
            throw CaptureError.notRecording
        }

        let config = SCStreamConfiguration()
        if let sourceRect = currentSourceRect {
            config.sourceRect = sourceRect
            config.width = currentCaptureArea.pixelWidth
            config.height = currentCaptureArea.pixelHeight
            config.destinationRect = CGRect(origin: .zero, size: currentCaptureArea.frame.size)
        } else {
            config.width = currentCaptureArea.pixelWidth
            config.height = currentCaptureArea.pixelHeight
        }
        config.pixelFormat = kCVPixelFormatType_32BGRA
        config.showsCursor = true

        let image = try await SCScreenshotManager.captureImage(
            contentFilter: filter,
            configuration: config
        )
        return image
    }

    private func display(matching displayID: CGDirectDisplayID?, in displays: [SCDisplay]) -> SCDisplay? {
        guard let displayID else { return nil }
        return displays.first { $0.displayID == displayID }
    }
}

// MARK: - Stream Output Handler

final class CaptureStreamOutput: NSObject, SCStreamOutput, SCStreamDelegate, @unchecked Sendable {
    private var _latestFrame: CMSampleBuffer?
    private let frameLock = NSLock()

    var latestFrame: CMSampleBuffer? {
        frameLock.lock()
        defer { frameLock.unlock() }
        return _latestFrame
    }

    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen else { return }
        frameLock.lock()
        _latestFrame = sampleBuffer
        frameLock.unlock()
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        // Stream stopped unexpectedly - this would be surfaced to the session manager
        print("[CaptureEngine] Stream stopped with error: \(error.localizedDescription)")
    }
}

// MARK: - Errors

enum CaptureError: LocalizedError {
    case noDisplayFound
    case applicationNotFound
    case notRecording
    case screenshotFailed

    var errorDescription: String? {
        switch self {
        case .noDisplayFound: return "No display found for capture"
        case .applicationNotFound: return "Target application not found"
        case .notRecording: return "No active recording session"
        case .screenshotFailed: return "Failed to capture screenshot"
        }
    }
}
