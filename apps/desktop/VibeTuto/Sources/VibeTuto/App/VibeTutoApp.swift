import SwiftUI

@main
struct VibeTutoApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        Settings {
            PreferencesRootView()
        }
    }
}
