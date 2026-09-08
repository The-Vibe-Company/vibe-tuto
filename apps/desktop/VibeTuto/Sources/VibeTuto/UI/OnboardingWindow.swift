import SwiftUI
import Cocoa

final class OnboardingWindowController: NSWindowController {
    convenience init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: DT.Size.onboardingWidth, height: DT.Size.onboardingHeight),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "CapTuto"
        window.center()
        window.contentView = NSHostingView(rootView: OnboardingView())
        window.backgroundColor = NSColor.windowBackgroundColor

        self.init(window: window)
    }
}

struct OnboardingView: View {
    @State private var screenRecordingGranted = false
    @State private var accessibilityGranted = false
    @AppStorage("apiToken") private var apiToken = ""

    private let permissionChecker = PermissionChecker()

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Set up CapTuto")
                    .font(.title3.weight(.semibold))
                Text("Allow capture, then connect your account.")
                    .foregroundStyle(.secondary)
            }

            VStack(spacing: 10) {
                permissionRow(
                    title: "Screen Recording",
                    detail: "Capture the screen while you record.",
                    icon: "rectangle.dashed.badge.record",
                    isGranted: screenRecordingGranted,
                    action: grantScreenRecording
                )
                permissionRow(
                    title: "Accessibility",
                    detail: "Detect clicks and app changes.",
                    icon: "hand.point.up.left",
                    isGranted: accessibilityGranted,
                    action: grantAccessibility
                )
            }

            Divider()

            VStack(alignment: .leading, spacing: 8) {
                Text("Workspace")
                    .font(.headline)
                if apiToken.isEmpty {
                    DesktopConnectView()
                } else {
                    Label("Connected", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                    Button("Use another workspace") {
                        apiToken = ""
                    }
                    .buttonStyle(.link)
                }
            }

            Spacer()

            HStack {
                Button("Skip") {
                    NSApp.keyWindow?.close()
                }
                Spacer()
                Button("Finish") {
                    UserDefaults.standard.set(apiToken, forKey: "apiToken")
                    NSApp.keyWindow?.close()
                }
                .buttonStyle(.borderedProminent)
                .disabled(apiToken.isEmpty)
            }
        }
        .padding(24)
        .frame(width: DT.Size.onboardingWidth, height: DT.Size.onboardingHeight)
        .onAppear(perform: refreshPermissions)
        .onReceive(Timer.publish(every: 2, on: .main, in: .common).autoconnect()) { _ in
            refreshPermissions()
        }
    }

    private func permissionRow(
        title: String,
        detail: String,
        icon: String,
        isGranted: Bool,
        action: @escaping () -> Void
    ) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .frame(width: 22)
                .foregroundStyle(isGranted ? .green : .secondary)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                Text(isGranted ? "Allowed" : detail)
                    .font(.caption)
                    .foregroundStyle(isGranted ? .green : .secondary)
            }

            Spacer()

            if isGranted {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } else {
                Button("Allow", action: action)
                    .controlSize(.small)
            }
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color(nsColor: .controlBackgroundColor))
        )
    }

    private func refreshPermissions() {
        screenRecordingGranted = permissionChecker.checkScreenRecordingSilent() == .granted
        accessibilityGranted = permissionChecker.checkAccessibility() == .granted
    }

    private func grantScreenRecording() {
        permissionChecker.requestScreenRecording()
    }

    private func grantAccessibility() {
        permissionChecker.promptAccessibility()
    }

}
