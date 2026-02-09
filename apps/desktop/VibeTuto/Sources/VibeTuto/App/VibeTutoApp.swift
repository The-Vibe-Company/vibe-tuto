import SwiftUI

@main
struct VibeTutoApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        Settings {
            PreferencesView()
                .frame(width: 500, height: 440)
                .preferredColorScheme(.dark)
        }
    }
}
