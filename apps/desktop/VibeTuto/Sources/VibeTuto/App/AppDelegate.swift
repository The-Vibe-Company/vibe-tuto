import Cocoa
import ServiceManagement

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var menuBarController: MenuBarController?
    private var onboardingWindowController: OnboardingWindowController?
    private let permissionChecker = PermissionChecker()
    private var userDefaultsObserver: NSObjectProtocol?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        ProcessInfo.processInfo.disableAutomaticTermination("CapTuto stays alive while capture UI is hidden")
        ProcessInfo.processInfo.disableSuddenTermination()

        menuBarController = MenuBarController()

        syncLaunchAtLoginPreference()
        userDefaultsObserver = NotificationCenter.default.addObserver(
            forName: UserDefaults.didChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.syncLaunchAtLoginPreference()
        }

        // Check permissions on launch (silent - no system dialog)
        let screenPerm = permissionChecker.checkScreenRecordingSilent()
        let accessPerm = permissionChecker.checkAccessibility()
        if screenPerm != .granted || accessPerm != .granted {
            showOnboarding()
        }
        SessionManager.shared.retryPendingUploadsSilently()

        // Register for app activation
        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(appDidActivate(_:)),
            name: NSWorkspace.didActivateApplicationNotification,
            object: nil
        )
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return false
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            showOnboarding()
            NSApp.activate(ignoringOtherApps: true)
        }
        return true
    }

    @objc private func appDidActivate(_ notification: Notification) {
        // Track app switches for the recording session
        guard let app = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication else {
            return
        }
        let bundleID = app.bundleIdentifier ?? "unknown"
        let appName = app.localizedName ?? "Unknown App"
        Task { @MainActor in
            SessionManager.shared.handleAppSwitch(
                bundleID: bundleID,
                name: appName
            )
        }
    }

    private func showOnboarding() {
        if onboardingWindowController == nil {
            onboardingWindowController = OnboardingWindowController()
        }
        onboardingWindowController?.showWindow(nil)
        onboardingWindowController?.window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    /// Register the app as a login item.
    func setLaunchAtLogin(_ enabled: Bool) {
        if #available(macOS 13.0, *) {
            do {
                if enabled {
                    try SMAppService.mainApp.register()
                } else {
                    try SMAppService.mainApp.unregister()
                }
            } catch {
                print("[AppDelegate] Failed to update login item: \(error)")
            }
        }
    }

    private func syncLaunchAtLoginPreference() {
        let enabled = UserDefaults.standard.bool(forKey: "launchAtLogin")
        setLaunchAtLogin(enabled)
    }

    deinit {
        if let userDefaultsObserver {
            NotificationCenter.default.removeObserver(userDefaultsObserver)
        }
    }
}
