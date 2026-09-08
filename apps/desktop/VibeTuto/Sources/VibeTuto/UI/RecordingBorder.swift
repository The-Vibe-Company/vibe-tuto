import Cocoa

/// Draws a thin recording border around the recording area.
@MainActor
final class RecordingBorderController {
    private var window: NSWindow?

    func show(region: CGRect? = nil) {
        let area = SessionManager.shared.currentCaptureArea
        let padding: CGFloat = region == nil ? 0 : 6
        let windowFrame = area.frame.insetBy(dx: -padding, dy: -padding)

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
            if let contentView = window?.contentView as? RecordingBorderView {
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

/// Custom NSView that draws a quiet red border.
final class RecordingBorderView: NSView {
    private let borderWidth: CGFloat = 2.0
    private let borderColor = NSColor.systemRed

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)

        guard let context = NSGraphicsContext.current?.cgContext else { return }

        let useHighContrast = NSWorkspace.shared.accessibilityDisplayShouldIncreaseContrast
        let width = useHighContrast ? 4.0 : borderWidth
        let inset = width / 2

        context.setStrokeColor(borderColor.cgColor)
        context.setLineWidth(width)
        let rect = bounds.insetBy(dx: inset, dy: inset)
        context.stroke(rect)
    }
}
