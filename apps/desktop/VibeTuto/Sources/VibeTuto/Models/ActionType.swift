import Foundation

/// All recognized action types for tutorial step detection.
enum ActionType: String, Codable, Sendable {
    case click
    case type
    case keyboardShortcut = "keyboard_shortcut"
    case appSwitch = "app_switch"
    case urlNavigation = "url_navigation"
    case menuSelection = "menu_selection"
    case drag
    case scroll
    case dialogInteraction = "dialog_interaction"
    case manualMarker = "manual_marker"
    case unknown
}
