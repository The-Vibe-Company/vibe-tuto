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
    private var captureArea: CaptureGeometry.CaptureArea?
    private var isMonitoring = false

    private let accessibilityReader = AccessibilityReader()
    private let plugins: [AppPlugin] = [
        BrowserPlugin(),
        VSCodePlugin(),
        TerminalPlugin(),
        FigmaPlugin(),
    ]

    /// Start monitoring global events.
    func start(
        sessionStart: Date,
        captureArea: CaptureGeometry.CaptureArea? = nil,
        onAction: @escaping ActionCallback
    ) {
        guard !isMonitoring else { return }
        self.sessionStartTime = sessionStart
        self.captureArea = captureArea
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
        captureArea = nil
        onAction = nil
    }

    // MARK: - Event Handlers

    private func handleClickEvent(_ event: NSEvent) {
        guard let sessionStart = sessionStartTime else { return }

        let screenLocation = NSEvent.mouseLocation
        let fallbackArea = CaptureGeometry.CaptureArea(
            frame: NSScreen.main?.frame ?? CGRect(x: 0, y: 0, width: 2560, height: 1600),
            visibleFrame: NSScreen.main?.visibleFrame ?? CGRect(x: 0, y: 0, width: 2560, height: 1560),
            scale: NSScreen.main?.backingScaleFactor ?? 1,
            displayID: nil
        )
        let activeArea = captureArea ?? fallbackArea

        // Convert to normalized coordinates (0-1 range)
        guard let normalized = CaptureGeometry.normalizedPoint(screenLocation, in: activeArea.frame) else {
            return
        }

        // Get accessibility info at click point.
        let frontApp = NSWorkspace.shared.frontmostApplication
        let windowTitle = accessibilityReader.frontWindowTitle()
        let pluginContext = pluginContext(
            bundleID: frontApp?.bundleIdentifier,
            windowTitle: windowTitle
        )
        let elementInfo = enrich(
            accessibilityReader.elementAt(
                point: CGPoint(
                    x: screenLocation.x,
                    y: activeArea.frame.maxY - (screenLocation.y - activeArea.frame.minY)
                )
            ),
            with: pluginContext
        )
        let relativeTime = Date().timeIntervalSince(sessionStart)

        let action = CapturedAction(
            relativeTime: relativeTime,
            actionType: .click,
            clickX: normalized.x,
            clickY: normalized.y,
            viewportWidth: activeArea.pixelWidth,
            viewportHeight: activeArea.pixelHeight,
            appBundleID: frontApp?.bundleIdentifier,
            appName: frontApp?.localizedName,
            windowTitle: windowTitle,
            url: pluginContext?.url,
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
        let windowTitle = accessibilityReader.frontWindowTitle()
        let pluginContext = pluginContext(
            bundleID: frontApp?.bundleIdentifier,
            windowTitle: windowTitle
        )
        let relativeTime = Date().timeIntervalSince(sessionStart)

        let action = CapturedAction(
            relativeTime: relativeTime,
            actionType: .keyboardShortcut,
            appBundleID: frontApp?.bundleIdentifier,
            appName: frontApp?.localizedName,
            windowTitle: windowTitle,
            url: pluginContext?.url,
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

    private func pluginContext(bundleID: String?, windowTitle: String?) -> AppPluginContext? {
        guard let bundleID else { return nil }
        return plugins
            .first { $0.supportedBundleIDs.contains(bundleID) }?
            .extractContext(bundleID: bundleID, windowTitle: windowTitle)
    }

    private func enrich(_ elementInfo: ElementInfo?, with context: AppPluginContext?) -> ElementInfo? {
        guard let context, !context.additionalInfo.isEmpty else {
            return elementInfo
        }

        if let elementInfo {
            return ElementInfo(
                role: elementInfo.role,
                title: elementInfo.title,
                value: elementInfo.value,
                parentChain: elementInfo.parentChain,
                context: context.additionalInfo
            )
        }

        return ElementInfo(
            role: "AppContext",
            title: nil,
            value: nil,
            parentChain: [],
            context: context.additionalInfo
        )
    }
}
