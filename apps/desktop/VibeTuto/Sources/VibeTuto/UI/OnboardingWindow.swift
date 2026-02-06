import SwiftUI
import Cocoa

/// Window controller for the first-launch onboarding flow.
final class OnboardingWindowController: NSWindowController {
    convenience init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 400, height: 500),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "Welcome to CapTuto"
        window.center()
        window.contentView = NSHostingView(rootView: OnboardingView())

        self.init(window: window)
    }
}

/// Three-step onboarding flow.
struct OnboardingView: View {
    @State private var currentStep = 0
    @State private var screenRecordingGranted = false
    @State private var accessibilityGranted = false
    @State private var apiToken = ""

    private let permissionChecker = PermissionChecker()

    var body: some View {
        VStack {
            switch currentStep {
            case 0:
                welcomeStep
            case 1:
                permissionsStep
            case 2:
                signInStep
            default:
                EmptyView()
            }
        }
        .frame(width: 400, height: 500)
        .onAppear {
            refreshPermissions()
        }
    }

    // MARK: - Step 1: Welcome

    private var welcomeStep: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "record.circle")
                .font(.system(size: 64))
                .foregroundColor(.accentColor)

            Text("Welcome to CapTuto Recorder")
                .font(.title2)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)

            Text("Record any workflow on your Mac.\nWe'll turn it into a tutorial.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Spacer()

            Button("Get Started") {
                withAnimation {
                    currentStep = 1
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.bottom, 32)
        }
        .padding(.horizontal, 40)
    }

    // MARK: - Step 2: Permissions

    private var permissionsStep: some View {
        VStack(spacing: 16) {
            Text("We need two permissions to work:")
                .font(.title3)
                .fontWeight(.medium)
                .padding(.top, 32)

            Spacer()

            // Screen Recording
            permissionRow(
                icon: "rectangle.dashed.badge.record",
                title: "Screen Recording",
                description: "To capture what's on your screen",
                isGranted: screenRecordingGranted,
                action: grantScreenRecording
            )

            // Accessibility
            permissionRow(
                icon: "hand.point.up.left",
                title: "Accessibility",
                description: "To detect your clicks and actions",
                isGranted: accessibilityGranted,
                action: grantAccessibility
            )

            Spacer()

            // Allow continuing even without screen recording (they can grant later)
            Button("Continue") {
                withAnimation {
                    currentStep = 2
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.bottom, 32)
        }
        .padding(.horizontal, 40)
        .onReceive(Timer.publish(every: 2, on: .main, in: .common).autoconnect()) { _ in
            refreshPermissions()
        }
    }

    private func permissionRow(
        icon: String,
        title: String,
        description: String,
        isGranted: Bool,
        action: @escaping () -> Void
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .frame(width: 40)
                .foregroundStyle(isGranted ? .green : .secondary)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                if isGranted {
                    Text("Granted")
                        .font(.caption)
                        .foregroundStyle(.green)
                } else {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if isGranted {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } else {
                Button("Grant") {
                    action()
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.primary.opacity(0.03))
        )
    }

    // MARK: - Step 3: Sign In (Token)

    private var signInStep: some View {
        VStack(spacing: 20) {
            Spacer()

            Image(systemName: "key.fill")
                .font(.system(size: 48))
                .foregroundColor(.accentColor)

            Text("Connect your account")
                .font(.title3)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)

            Text("Paste your API token to upload recordings.\nYou can find it in your account settings.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            VStack(spacing: 8) {
                SecureField("Paste your API token", text: $apiToken)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 280)

                Button("Get Token from Website") {
                    openBrowserSettings()
                }
                .buttonStyle(.plain)
                .font(.caption)
                .foregroundColor(.accentColor)
            }

            Spacer()

            HStack(spacing: 12) {
                Button("Skip for now") {
                    // Close onboarding
                    NSApp.keyWindow?.close()
                }
                .buttonStyle(.bordered)
                .controlSize(.large)

                Button("Save & Finish") {
                    UserDefaults.standard.set(apiToken, forKey: "apiToken")
                    NSApp.keyWindow?.close()
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(apiToken.isEmpty)
            }
            .padding(.bottom, 32)
        }
        .padding(.horizontal, 40)
    }

    // MARK: - Actions

    private func refreshPermissions() {
        screenRecordingGranted = permissionChecker.checkScreenRecordingSilent() == .granted
        accessibilityGranted = permissionChecker.checkAccessibility() == .granted
    }

    private func grantScreenRecording() {
        // This registers the app with TCC so it appears in the Screen Recording list
        permissionChecker.requestScreenRecording()
    }

    private func grantAccessibility() {
        permissionChecker.promptAccessibility()
    }

    private func openBrowserSettings() {
        let baseURL = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
        if let url = URL(string: "\(baseURL)/settings") {
            NSWorkspace.shared.open(url)
        }
    }
}
