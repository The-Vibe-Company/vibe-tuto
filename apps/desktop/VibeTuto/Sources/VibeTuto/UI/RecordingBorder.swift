import Cocoa

/// Draws a glowing, pulsing border with viewfinder brackets around the recording area.
final class RecordingBorderController {
    private var window: NSWindow?

    func show(region: CGRect? = nil) {
        guard let screen = NSScreen.main else { return }

        let windowFrame: NSRect
        if let region = region {
            // Convert from ScreenCaptureKit coordinates (top-left origin) to AppKit (bottom-left origin)
            let flippedY = screen.frame.height - region.origin.y - region.height
            let padding: CGFloat = 6
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

/// Custom NSView that draws a glowing border with pulse animation and viewfinder brackets.
final class RecordingBorderView: NSView {
    private let borderWidth: CGFloat = 3.0
    private let borderColor = NSColor(red: 1.0, green: 0.27, blue: 0.23, alpha: 1.0) // #FF453A — accent red
    private let bracketLength: CGFloat = 24.0
    private let bracketOffset: CGFloat = 1.5 // half border width
    private var pulseAlpha: CGFloat = 1.0
    private var pulseDirection: CGFloat = -1
    private var displayLink: CVDisplayLink?
    private var pulseTimer: Timer?

    override init(frame: NSRect) {
        super.init(frame: frame)
        startPulse()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        startPulse()
    }

    deinit {
        pulseTimer?.invalidate()
    }

    private func startPulse() {
        pulseTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            guard let self else { return }
            // Oscillate alpha between 0.6 and 1.0 over ~1.5s
            let step: CGFloat = (1.0 / 30.0) / 1.5 * 2.0 * 0.4 // covers 0.4 range in 0.75s
            self.pulseAlpha += step * self.pulseDirection
            if self.pulseAlpha <= 0.6 {
                self.pulseAlpha = 0.6
                self.pulseDirection = 1
            } else if self.pulseAlpha >= 1.0 {
                self.pulseAlpha = 1.0
                self.pulseDirection = -1
            }
            DispatchQueue.main.async {
                self.needsDisplay = true
            }
        }
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)

        guard let context = NSGraphicsContext.current?.cgContext else { return }

        let useHighContrast = NSWorkspace.shared.accessibilityDisplayShouldIncreaseContrast
        let width = useHighContrast ? 4.0 : borderWidth
        let inset = width / 2

        let color = borderColor.withAlphaComponent(pulseAlpha)

        // Draw glow (outer shadow effect)
        let glowColor = borderColor.withAlphaComponent(pulseAlpha * 0.35)
        context.setShadow(offset: .zero, blur: 8, color: glowColor.cgColor)
        context.setStrokeColor(color.cgColor)
        context.setLineWidth(width)

        let rect = bounds.insetBy(dx: inset + 4, dy: inset + 4) // extra inset for glow space
        context.stroke(rect)

        // Reset shadow for brackets
        context.setShadow(offset: .zero, blur: 0, color: nil)

        // Draw viewfinder corner brackets
        let bracketColor = NSColor.white.withAlphaComponent(pulseAlpha * 0.9)
        context.setStrokeColor(bracketColor.cgColor)
        context.setLineWidth(2.0)
        context.setLineCap(.round)

        let r = rect
        let bl = bracketLength

        // Top-left bracket
        context.move(to: CGPoint(x: r.minX, y: r.minY + bl))
        context.addLine(to: CGPoint(x: r.minX, y: r.minY))
        context.addLine(to: CGPoint(x: r.minX + bl, y: r.minY))

        // Top-right bracket
        context.move(to: CGPoint(x: r.maxX - bl, y: r.minY))
        context.addLine(to: CGPoint(x: r.maxX, y: r.minY))
        context.addLine(to: CGPoint(x: r.maxX, y: r.minY + bl))

        // Bottom-right bracket
        context.move(to: CGPoint(x: r.maxX, y: r.maxY - bl))
        context.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        context.addLine(to: CGPoint(x: r.maxX - bl, y: r.maxY))

        // Bottom-left bracket
        context.move(to: CGPoint(x: r.minX + bl, y: r.maxY))
        context.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        context.addLine(to: CGPoint(x: r.minX, y: r.maxY - bl))

        context.strokePath()
    }
}
