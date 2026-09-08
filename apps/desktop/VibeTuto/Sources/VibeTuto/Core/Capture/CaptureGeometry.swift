import Cocoa
import CoreGraphics

/// Pure geometry helpers shared by capture, event monitoring, and tests.
enum CaptureGeometry {
    struct ScreenSnapshot: Sendable, Equatable {
        let frame: CGRect
        let visibleFrame: CGRect
        let scale: CGFloat
        let displayID: CGDirectDisplayID?
    }

    struct CaptureArea: Sendable, Equatable {
        let frame: CGRect
        let visibleFrame: CGRect
        let scale: CGFloat
        let displayID: CGDirectDisplayID?

        var pixelWidth: Int {
            max(1, Int(frame.width * scale))
        }

        var pixelHeight: Int {
            max(1, Int(frame.height * scale))
        }

        var resolutionString: String {
            "\(pixelWidth)x\(pixelHeight)"
        }
    }

    static func snapshots(from screens: [NSScreen]) -> [ScreenSnapshot] {
        screens.map { screen in
            let displayID = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID
            return ScreenSnapshot(
                frame: screen.frame,
                visibleFrame: screen.visibleFrame,
                scale: screen.backingScaleFactor,
                displayID: displayID
            )
        }
    }

    static func area(
        for mode: RecordingMode,
        region: CGRect?,
        mouseLocation: CGPoint,
        screens: [ScreenSnapshot]
    ) -> CaptureArea {
        let screen: ScreenSnapshot
        if let region, mode == .region {
            screen = screenContaining(point: CGPoint(x: region.midX, y: region.midY), screens: screens)
        } else {
            screen = screenContaining(point: mouseLocation, screens: screens)
        }

        let frame = (mode == .region && region != nil) ? region! : screen.frame
        return CaptureArea(
            frame: frame,
            visibleFrame: screen.visibleFrame,
            scale: screen.scale,
            displayID: screen.displayID
        )
    }

    static func screenContaining(point: CGPoint, screens: [ScreenSnapshot]) -> ScreenSnapshot {
        if let containing = screens.first(where: { $0.frame.contains(point) }) {
            return containing
        }
        return screens.first ?? ScreenSnapshot(
            frame: CGRect(x: 0, y: 0, width: 2560, height: 1600),
            visibleFrame: CGRect(x: 0, y: 0, width: 2560, height: 1560),
            scale: 1,
            displayID: nil
        )
    }

    static func normalizedPoint(_ point: CGPoint, in captureFrame: CGRect) -> CGPoint? {
        guard captureFrame.width > 0, captureFrame.height > 0 else { return nil }
        guard captureFrame.contains(point) else { return nil }

        let x = (point.x - captureFrame.minX) / captureFrame.width
        let y = 1.0 - ((point.y - captureFrame.minY) / captureFrame.height)
        return CGPoint(x: clamp01(x), y: clamp01(y))
    }

    static func rectRelativeToScreen(_ rect: CGRect, screenFrame: CGRect) -> CGRect {
        CGRect(
            x: rect.minX - screenFrame.minX,
            y: rect.minY - screenFrame.minY,
            width: rect.width,
            height: rect.height
        )
    }

    private static func clamp01(_ value: CGFloat) -> CGFloat {
        min(1, max(0, value))
    }
}
