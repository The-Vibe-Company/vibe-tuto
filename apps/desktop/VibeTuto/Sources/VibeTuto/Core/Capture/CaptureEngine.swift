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
    private var currentRegionRect: CGRect?
    private var isCapturing = false

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

        let filter: SCContentFilter
        switch mode {
        case .fullScreen:
            guard let display = content.displays.first else {
                throw CaptureError.noDisplayFound
            }
            filter = SCContentFilter(display: display, excludingWindows: [])

        case .singleApp:
            guard let bundleID = appBundleID,
                  let app = content.applications.first(where: { $0.bundleIdentifier == bundleID }) else {
                throw CaptureError.applicationNotFound
            }
            guard let display = content.displays.first else {
                throw CaptureError.noDisplayFound
            }
            filter = SCContentFilter(display: display, including: [app], exceptingWindows: [])

        case .region:
            guard let display = content.displays.first else {
                throw CaptureError.noDisplayFound
            }
            filter = SCContentFilter(display: display, excludingWindows: [])
        }

        currentFilter = filter
        currentRegionRect = (mode == .region) ? regionRect : nil

        let config = SCStreamConfiguration()
        if mode == .region, let regionRect = regionRect {
            config.sourceRect = regionRect
            let scale = await MainActor.run { NSScreen.main?.backingScaleFactor ?? 2.0 }
            config.width = Int(regionRect.width * scale)
            config.height = Int(regionRect.height * scale)
            config.destinationRect = CGRect(origin: .zero, size: CGSize(width: regionRect.width, height: regionRect.height))
        } else {
            config.width = 2560
            config.height = 1600
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
        self.currentRegionRect = nil
        isCapturing = false
    }

    /// Takes a high-resolution screenshot of the current content.
    func takeScreenshot() async throws -> CGImage {
        guard let filter = currentFilter else {
            throw CaptureError.notRecording
        }

        let config = SCStreamConfiguration()
        if let regionRect = currentRegionRect {
            config.sourceRect = regionRect
            let scale = await MainActor.run { NSScreen.main?.backingScaleFactor ?? 2.0 }
            config.width = Int(regionRect.width * scale)
            config.height = Int(regionRect.height * scale)
            config.destinationRect = CGRect(origin: .zero, size: CGSize(width: regionRect.width, height: regionRect.height))
        } else {
            config.width = 2560
            config.height = 1600
        }
        config.pixelFormat = kCVPixelFormatType_32BGRA
        config.showsCursor = true

        let image = try await SCScreenshotManager.captureImage(
            contentFilter: filter,
            configuration: config
        )
        return image
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
