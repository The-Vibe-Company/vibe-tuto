import Foundation
import Cocoa
import ApplicationServices

/// Reads accessibility (AXUIElement) information from the focused application.
final class AccessibilityReader: @unchecked Sendable {

    /// Check if accessibility permission is granted.
    static func checkPermission() -> PermissionStatus {
        let trusted = AXIsProcessTrustedWithOptions(
            [kAXTrustedCheckOptionPrompt.takeUnretainedValue(): false] as CFDictionary
        )
        return trusted ? .granted : .denied
    }

    /// Prompt the user for accessibility permission.
    static func requestPermission() {
        AXIsProcessTrustedWithOptions(
            [kAXTrustedCheckOptionPrompt.takeUnretainedValue(): true] as CFDictionary
        )
    }

    /// Get element info at a screen point using the system-wide accessibility element.
    func elementAt(point: CGPoint) -> ElementInfo? {
        autoreleasepool {
            let systemWide = AXUIElementCreateSystemWide()

            var element: AXUIElement?
            let result = AXUIElementCopyElementAtPosition(systemWide, Float(point.x), Float(point.y), &element)

            guard result == .success, let axElement = element else {
                return nil
            }

            return readElementInfo(axElement)
        }
    }

    /// Get the title of the frontmost window.
    func frontWindowTitle() -> String? {
        autoreleasepool {
            guard let frontApp = NSWorkspace.shared.frontmostApplication else {
                return nil
            }

            let appElement = AXUIElementCreateApplication(frontApp.processIdentifier)
            var windowValue: AnyObject?
            let result = AXUIElementCopyAttributeValue(appElement, kAXFocusedWindowAttribute as CFString, &windowValue)

            guard result == .success, let windowObj = windowValue else {
                return nil
            }

            guard CFGetTypeID(windowObj) == AXUIElementGetTypeID() else { return nil }
            let windowElement = windowObj as! AXUIElement
            return stringAttribute(windowElement, kAXTitleAttribute)
        }
    }

    /// Build an ElementInfo from an AXUIElement.
    private func readElementInfo(_ element: AXUIElement) -> ElementInfo {
        let role = stringAttribute(element, kAXRoleAttribute) ?? "Unknown"
        let title = stringAttribute(element, kAXTitleAttribute)
            ?? stringAttribute(element, kAXDescriptionAttribute)
        let value = stringAttribute(element, kAXValueAttribute)
        let parentChain = buildParentChain(element)

        return ElementInfo(
            role: role,
            title: title,
            value: value,
            parentChain: parentChain
        )
    }

    /// Walk up the AXUIElement parent chain collecting roles.
    private func buildParentChain(_ element: AXUIElement, maxDepth: Int = 5) -> [String] {
        var chain: [String] = []
        var current: AXUIElement? = element
        var depth = 0

        while let el = current, depth < maxDepth {
            var parentValue: AnyObject?
            let result = AXUIElementCopyAttributeValue(el, kAXParentAttribute as CFString, &parentValue)
            guard result == .success, let parentObj = parentValue else { break }
            guard CFGetTypeID(parentObj) == AXUIElementGetTypeID() else { break }
            let parent = parentObj as! AXUIElement

            if let role = stringAttribute(parent, kAXRoleAttribute) {
                chain.append(role)
            }
            current = parent
            depth += 1
        }

        return chain
    }

    /// Helper to read a string attribute from an AXUIElement.
    private func stringAttribute(_ element: AXUIElement, _ attribute: String) -> String? {
        var value: AnyObject?
        let result = AXUIElementCopyAttributeValue(element, attribute as CFString, &value)
        guard result == .success else { return nil }
        return value as? String
    }
}
