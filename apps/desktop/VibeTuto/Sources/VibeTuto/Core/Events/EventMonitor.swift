import Foundation
import Cocoa
import CoreGraphics

/// Callback for when a user action is detected.
typealias ActionCallback = @Sendable (CapturedAction) -> Void

/// Monitors global NSEvents (clicks, keystrokes, scrolls) across all applications.
final class EventMonitor: @unchecked Sendable {
    private var globalClickMonitor: Any?
    private var globalKeyMonitor: Any?
    private var globalScrollMonitor: Any?
    private var onAction: ActionCallback?
    private var sessionStartTime: Date?
    private var isMonitoring = false

    private let accessibilityReader = AccessibilityReader()

    /// Start monitoring global events.
    func start(sessionStart: Date, onAction: @escaping ActionCallback) {
        guard !isMonitoring else { return }
        self.sessionStartTime = sessionStart
        self.onAction = onAction
        isMonitoring = true

        // Monitor mouse clicks (left, right)
        globalClickMonitor = NSEvent.addGlobalMonitorForEvents(
            matching: [.leftMouseDown, .rightMouseDown]
        ) { [weak self] event in
            self?.handleClickEvent(event)
        }

        // Monitor key events (for keyboard shortcuts)
        globalKeyMonitor = NSEvent.addGlobalMonitorForEvents(
            matching: [.keyDown]
        ) { [weak self] event in
            self?.handleKeyEvent(event)
        }

        // Monitor scroll events
        globalScrollMonitor = NSEvent.addGlobalMonitorForEvents(
            matching: [.scrollWheel]
        ) { [weak self] event in
            self?.handleScrollEvent(event)
        }
    }

    /// Stop monitoring all events.
    func stop() {
        if let monitor = globalClickMonitor {
            NSEvent.removeMonitor(monitor)
            globalClickMonitor = nil
        }
        if let monitor = globalKeyMonitor {
            NSEvent.removeMonitor(monitor)
            globalKeyMonitor = nil
        }
        if let monitor = globalScrollMonitor {
            NSEvent.removeMonitor(monitor)
            globalScrollMonitor = nil
        }
        isMonitoring = false
        onAction = nil
    }

    // MARK: - Event Handlers

    var captureScreenFrame: CGRect?

    private func handleClickEvent(_ event: NSEvent) {
        guard let sessionStart = sessionStartTime else { return }

        let screenLocation = event.locationInWindow
        let screenFrame = captureScreenFrame ?? NSScreen.main?.frame ?? CGRect(x: 0, y: 0, width: 2560, height: 1600)

        // Convert to normalized coordinates (0-1 range)
        let normalizedX = (screenLocation.x - screenFrame.minX) / screenFrame.width
        // NSEvent y is from bottom, flip to top-origin
        let normalizedY = 1.0 - ((screenLocation.y - screenFrame.minY) / screenFrame.height)

        // Get accessibility info at click point
        let elementInfo = accessibilityReader.elementAt(
            point: CGPoint(x: screenLocation.x, y: (NSScreen.screens.first?.frame.height ?? screenFrame.height) - screenLocation.y)
        )

        let frontApp = NSWorkspace.shared.frontmostApplication
        let relativeTime = Date().timeIntervalSince(sessionStart)

        let action = CapturedAction(
            relativeTime: relativeTime,
            actionType: .click,
            clickX: normalizedX,
            clickY: normalizedY,
            viewportWidth: Int(screenFrame.width),
            viewportHeight: Int(screenFrame.height),
            appBundleID: frontApp?.bundleIdentifier,
            appName: frontApp?.localizedName,
            windowTitle: accessibilityReader.frontWindowTitle(),
            elementInfo: elementInfo
        )

        onAction?(action)
    }

    private func handleKeyEvent(_ event: NSEvent) {
        guard let sessionStart = sessionStartTime else { return }

        let modifiers = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
        let hasModifier = modifiers.contains(.command) || modifiers.contains(.control) || modifiers.contains(.option)

        // Only capture keyboard shortcuts (modifier + key), not plain typing
        guard hasModifier else { return }

        let keyCombo = buildKeyCombo(event: event, modifiers: modifiers)
        let frontApp = NSWorkspace.shared.frontmostApplication
        let relativeTime = Date().timeIntervalSince(sessionStart)

        let action = CapturedAction(
            relativeTime: relativeTime,
            actionType: .keyboardShortcut,
            appBundleID: frontApp?.bundleIdentifier,
            appName: frontApp?.localizedName,
            windowTitle: accessibilityReader.frontWindowTitle(),
            keyCombo: keyCombo
        )

        onAction?(action)
    }

    private func handleScrollEvent(_ event: NSEvent) {
        // Scroll events are intentionally not tracked as individual steps.
        // They are too noisy. Only significant scrolls (e.g. page navigation)
        // would be detected by the StepDetector via context changes.
    }

    // MARK: - Helpers

    private func buildKeyCombo(event: NSEvent, modifiers: NSEvent.ModifierFlags) -> String {
        var parts: [String] = []
        if modifiers.contains(.command) { parts.append("Cmd") }
        if modifiers.contains(.control) { parts.append("Ctrl") }
        if modifiers.contains(.option) { parts.append("Opt") }
        if modifiers.contains(.shift) { parts.append("Shift") }

        if let chars = event.charactersIgnoringModifiers {
            parts.append(chars.uppercased())
        }

        return parts.joined(separator: "+")
    }
}
