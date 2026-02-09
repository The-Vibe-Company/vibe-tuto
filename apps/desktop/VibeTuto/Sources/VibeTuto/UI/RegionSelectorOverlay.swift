import Cocoa

/// Controller for the fullscreen region selection overlay.
final class RegionSelectorController {
    private var window: NSWindow?
    private var onRegionSelected: ((CGRect) -> Void)?
    private var onCancelled: (() -> Void)?

    func show(onSelected: @escaping (CGRect) -> Void, onCancelled: @escaping () -> Void) {
        self.onRegionSelected = onSelected
        self.onCancelled = onCancelled

        guard let screen = NSScreen.main else { return }

        let selectorWindow = NSWindow(
            contentRect: screen.frame,
            styleMask: .borderless,
            backing: .buffered,
            defer: false
        )
        selectorWindow.level = .screenSaver
        selectorWindow.backgroundColor = .clear
        selectorWindow.isOpaque = false
        selectorWindow.hasShadow = false
        selectorWindow.ignoresMouseEvents = false
        selectorWindow.acceptsMouseMovedEvents = true
        selectorWindow.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

        let selectorView = RegionSelectorView(frame: screen.frame)
        selectorView.onSelectionComplete = { [weak self] rect in
            self?.handleSelection(rect, screenHeight: screen.frame.height)
        }
        selectorView.onCancel = { [weak self] in
            self?.handleCancel()
        }
        selectorWindow.contentView = selectorView
        selectorWindow.makeKeyAndOrderFront(nil)
        selectorWindow.makeFirstResponder(selectorView)
        NSApp.activate(ignoringOtherApps: true)

        self.window = selectorWindow
    }

    private func handleSelection(_ rect: CGRect, screenHeight: CGFloat) {
        // Convert from NSView coordinates (bottom-left origin)
        // to ScreenCaptureKit coordinates (top-left origin)
        let flippedRect = CGRect(
            x: rect.origin.x,
            y: screenHeight - rect.origin.y - rect.height,
            width: rect.width,
            height: rect.height
        )
        dismiss()
        onRegionSelected?(flippedRect)
    }

    private func handleCancel() {
        dismiss()
        onCancelled?()
    }

    func dismiss() {
        window?.orderOut(nil)
        window = nil
    }
}

/// NSView that handles mouse drag for region selection.
final class RegionSelectorView: NSView {
    var onSelectionComplete: ((CGRect) -> Void)?
    var onCancel: (() -> Void)?

    private var dragStart: NSPoint?
    private var currentRect: CGRect?
    private let overlayColor = NSColor.black.withAlphaComponent(0.3)
    private let selectionBorderColor = NSColor(red: 0.6, green: 0.3, blue: 1.0, alpha: 1.0)
    private let selectionBorderWidth: CGFloat = 2.0

    override var acceptsFirstResponder: Bool { true }

    override func resetCursorRects() {
        addCursorRect(bounds, cursor: .crosshair)
    }

    override func keyDown(with event: NSEvent) {
        if event.keyCode == 53 { // Escape
            onCancel?()
        }
    }

    override func mouseDown(with event: NSEvent) {
        dragStart = convert(event.locationInWindow, from: nil)
        currentRect = nil
        needsDisplay = true
    }

    override func mouseDragged(with event: NSEvent) {
        guard let start = dragStart else { return }
        let current = convert(event.locationInWindow, from: nil)
        let rect = CGRect(
            x: min(start.x, current.x),
            y: min(start.y, current.y),
            width: abs(current.x - start.x),
            height: abs(current.y - start.y)
        )
        currentRect = rect
        needsDisplay = true
    }

    override func mouseUp(with event: NSEvent) {
        guard let rect = currentRect, rect.width > 10, rect.height > 10 else {
            dragStart = nil
            currentRect = nil
            needsDisplay = true
            return
        }
        onSelectionComplete?(rect)
    }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        guard let context = NSGraphicsContext.current?.cgContext else { return }

        // Draw semi-transparent overlay
        context.setFillColor(overlayColor.cgColor)
        context.fill(bounds)

        if let rect = currentRect {
            // Clear the selected region
            context.clear(rect)

            // Draw border around selection
            context.setStrokeColor(selectionBorderColor.cgColor)
            context.setLineWidth(selectionBorderWidth)
            context.stroke(rect.insetBy(dx: -1, dy: -1))

            // Draw dimension label
            drawDimensionLabel(for: rect)
        } else {
            // Draw instruction text
            drawInstructionText()
        }
    }

    private func drawDimensionLabel(for rect: CGRect) {
        let text = "\(Int(rect.width)) x \(Int(rect.height))"
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.monospacedSystemFont(ofSize: 12, weight: .medium),
            .foregroundColor: NSColor.white,
            .backgroundColor: NSColor.black.withAlphaComponent(0.7)
        ]
        let attrString = NSAttributedString(string: " \(text) ", attributes: attributes)
        let labelSize = attrString.size()
        let labelPoint = NSPoint(
            x: rect.midX - labelSize.width / 2,
            y: rect.maxY + 4
        )
        attrString.draw(at: labelPoint)
    }

    private func drawInstructionText() {
        let text = "Drag to select a region. Press Escape to cancel."
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 16, weight: .medium),
            .foregroundColor: NSColor.white
        ]
        let attrString = NSAttributedString(string: text, attributes: attributes)
        let size = attrString.size()
        let point = NSPoint(
            x: bounds.midX - size.width / 2,
            y: bounds.height - 60
        )
        attrString.draw(at: point)
    }
}
