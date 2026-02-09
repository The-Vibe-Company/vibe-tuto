import Cocoa

/// Draws a thin colored border around the recording area.
final class RecordingBorderController {
    private var window: NSWindow?

    func show(region: CGRect? = nil) {
        guard let screen = NSScreen.main else { return }

        let windowFrame: NSRect
        if let region = region {
            // Convert from ScreenCaptureKit coordinates (top-left origin) to AppKit (bottom-left origin)
            let flippedY = screen.frame.height - region.origin.y - region.height
            let padding: CGFloat = 4
            windowFrame = CGRect(
                x: region.origin.x - padding,
                y: flippedY - padding,
                width: region.width + padding * 2,
                height: region.height + padding * 2
            )
        } else {
            windowFrame = screen.frame
        }

        if window == nil {
            let borderWindow = NSWindow(
                contentRect: windowFrame,
                styleMask: .borderless,
                backing: .buffered,
                defer: false
            )
            borderWindow.level = .statusBar
            borderWindow.backgroundColor = .clear
            borderWindow.isOpaque = false
            borderWindow.ignoresMouseEvents = true
            borderWindow.hasShadow = false
            borderWindow.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

            let borderView = RecordingBorderView(frame: NSRect(origin: .zero, size: windowFrame.size))
            borderWindow.contentView = borderView

            self.window = borderWindow
        } else {
            window?.setFrame(windowFrame, display: true)
            if let contentView = window?.contentView {
                contentView.frame = NSRect(origin: .zero, size: windowFrame.size)
                contentView.needsDisplay = true
            }
        }
        window?.orderFrontRegardless()
    }

    func hide() {
        window?.orderOut(nil)
    }
}

/// Custom NSView that draws a border around the screen edges.
final class RecordingBorderView: NSView {
    private let borderWidth: CGFloat = 2.0
    private let borderColor = NSColor(red: 0.6, green: 0.3, blue: 1.0, alpha: 0.8) // Brand purple

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)

        guard let context = NSGraphicsContext.current?.cgContext else { return }

        let useHighContrast = NSWorkspace.shared.accessibilityDisplayShouldIncreaseContrast
        let width = useHighContrast ? 3.0 : borderWidth

        context.setStrokeColor(borderColor.cgColor)
        context.setLineWidth(width)

        let inset = width / 2
        let rect = bounds.insetBy(dx: inset, dy: inset)
        context.stroke(rect)
    }
}
