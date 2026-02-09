import SwiftUI
import Cocoa

/// Window controller for the first-launch onboarding flow.
final class OnboardingWindowController: NSWindowController {
    convenience init() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 440, height: 540),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "Welcome to CapTuto"
        window.center()
        window.contentView = NSHostingView(rootView: OnboardingView())
        window.backgroundColor = NSColor(red: 0.008, green: 0.031, blue: 0.09, alpha: 1.0)

        self.init(window: window)
    }
}

/// Three-step dark studio onboarding flow.
struct OnboardingView: View {
    @State private var currentStep = 0
    @State private var screenRecordingGranted = false
    @State private var accessibilityGranted = false
    @State private var apiToken = ""

    private let permissionChecker = PermissionChecker()

    var body: some View {
        VStack(spacing: 0) {
            // Step indicator — horizontal dashes
            HStack(spacing: DT.Spacing.xs) {
                ForEach(0..<3) { index in
                    RoundedRectangle(cornerRadius: 1.5)
                        .fill(index == currentStep ? DT.Colors.accentRed : DT.Colors.border)
                        .frame(width: index == currentStep ? 24 : 16, height: 3)
                        .animation(DT.Anim.springSnappy, value: currentStep)
                }
            }
            .padding(.top, DT.Spacing.lg)
            .padding(.bottom, DT.Spacing.md)

            // Content
            Group {
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
            .transition(.asymmetric(
                insertion: .move(edge: .trailing).combined(with: .opacity),
                removal: .move(edge: .leading).combined(with: .opacity)
            ))
            .animation(DT.Anim.springGentle, value: currentStep)
        }
        .frame(width: 440, height: 540)
        .background(DT.Colors.surface)
        .preferredColorScheme(.dark)
        .onAppear {
            refreshPermissions()
        }
    }

    // MARK: - Step 1: Welcome

    private var welcomeStep: some View {
        VStack(spacing: DT.Spacing.lg) {
            Spacer()

            // Branded record circle with glow
            ZStack {
                Circle()
                    .fill(DT.Colors.accentRed.opacity(0.15))
                    .frame(width: 120, height: 120)

                Circle()
                    .fill(DT.Colors.accentRed.opacity(0.08))
                    .frame(width: 96, height: 96)

                Circle()
                    .fill(DT.Colors.accentRed)
                    .frame(width: 72, height: 72)
                    .shadow(color: DT.Colors.glowRed, radius: 20)

                Image(systemName: "record.circle")
                    .font(.system(size: 32, weight: .light))
                    .foregroundStyle(.white)
            }

            VStack(spacing: DT.Spacing.xs) {
                Text("CAPTUTO")
                    .font(DT.Typography.sectionLabel)
                    .tracking(2)
                    .foregroundStyle(DT.Colors.textSecondary)

                Text("Recorder")
                    .font(.system(size: 24, weight: .heavy, design: .rounded))
                    .foregroundStyle(DT.Colors.textPrimary)
            }

            Text("Record any workflow on your Mac.\nWe'll turn it into a tutorial.")
                .font(DT.Typography.body)
                .foregroundStyle(DT.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(4)

            Spacer()

            Button("Get Started") {
                withAnimation {
                    currentStep = 1
                }
            }
            .buttonStyle(RecordButtonStyle())
            .padding(.bottom, DT.Spacing.xxl)
        }
        .padding(.horizontal, 48)
    }

    // MARK: - Step 2: Permissions

    private var permissionsStep: some View {
        VStack(spacing: DT.Spacing.md) {
            Text("Permissions")
                .font(DT.Typography.heading)
                .foregroundStyle(DT.Colors.textPrimary)
                .padding(.top, DT.Spacing.xl)

            Text("We need two permissions to work")
                .font(DT.Typography.caption)
                .foregroundStyle(DT.Colors.textSecondary)

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

            Button("Continue") {
                withAnimation {
                    currentStep = 2
                }
            }
            .buttonStyle(RecordButtonStyle())
            .padding(.bottom, DT.Spacing.xxl)
        }
        .padding(.horizontal, 48)
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
        HStack(spacing: DT.Spacing.md) {
            // Left accent bar
            RoundedRectangle(cornerRadius: 1.5)
                .fill(isGranted ? DT.Colors.accentTeal : DT.Colors.border)
                .frame(width: 3, height: 40)

            Image(systemName: icon)
                .font(.system(size: 22))
                .frame(width: 32)
                .foregroundStyle(isGranted ? DT.Colors.accentTeal : DT.Colors.textSecondary)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(DT.Typography.body)
                    .foregroundStyle(DT.Colors.textPrimary)
                if isGranted {
                    Text("Granted")
                        .font(DT.Typography.caption)
                        .foregroundStyle(DT.Colors.accentTeal)
                } else {
                    Text(description)
                        .font(DT.Typography.caption)
                        .foregroundStyle(DT.Colors.textSecondary)
                }
            }

            Spacer()

            if isGranted {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(DT.Colors.accentTeal)
                    .font(.system(size: 18))
            } else {
                Button("Grant") {
                    action()
                }
                .buttonStyle(StudioButtonStyle())
            }
        }
        .padding(.horizontal, DT.Spacing.md)
        .padding(.vertical, DT.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DT.Radius.md)
                .fill(DT.Colors.card)
        )
        .overlay(
            RoundedRectangle(cornerRadius: DT.Radius.md)
                .strokeBorder(isGranted ? DT.Colors.accentTeal.opacity(0.3) : DT.Colors.border, lineWidth: 1)
        )
    }

    // MARK: - Step 3: Sign In (Token)

    private var signInStep: some View {
        VStack(spacing: DT.Spacing.lg) {
            Spacer()

            // Key icon in circle
            ZStack {
                Circle()
                    .fill(DT.Colors.card)
                    .frame(width: 72, height: 72)
                    .overlay(
                        Circle()
                            .strokeBorder(DT.Colors.border, lineWidth: 1)
                    )

                Image(systemName: "key.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(DT.Colors.accentAmber)
            }

            VStack(spacing: DT.Spacing.xs) {
                Text("Connect your account")
                    .font(DT.Typography.heading)
                    .foregroundStyle(DT.Colors.textPrimary)

                Text("Paste your API token to upload recordings.\nYou can find it in your account settings.")
                    .font(DT.Typography.caption)
                    .foregroundStyle(DT.Colors.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }

            VStack(spacing: DT.Spacing.sm) {
                SecureField("Paste your API token", text: $apiToken)
                    .textFieldStyle(.plain)
                    .font(DT.Typography.mono)
                    .foregroundStyle(DT.Colors.textPrimary)
                    .padding(.horizontal, DT.Spacing.md)
                    .padding(.vertical, DT.Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: DT.Radius.sm)
                            .fill(DT.Colors.card)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: DT.Radius.sm)
                            .strokeBorder(DT.Colors.border, lineWidth: 1)
                    )
                    .frame(maxWidth: 300)

                Button("Get Token from Website") {
                    openBrowserSettings()
                }
                .buttonStyle(.plain)
                .font(DT.Typography.caption)
                .foregroundStyle(DT.Colors.accentBlue)
            }

            Spacer()

            HStack(spacing: DT.Spacing.md) {
                Button("Skip for now") {
                    NSApp.keyWindow?.close()
                }
                .buttonStyle(GhostButtonStyle())

                Button("Save & Finish") {
                    UserDefaults.standard.set(apiToken, forKey: "apiToken")
                    NSApp.keyWindow?.close()
                }
                .buttonStyle(RecordButtonStyle())
                .disabled(apiToken.isEmpty)
            }
            .padding(.bottom, DT.Spacing.xxl)
        }
        .padding(.horizontal, 48)
    }

    // MARK: - Actions

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

    private func openBrowserSettings() {
        let baseURL = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
        if let url = URL(string: "\(baseURL)/settings") {
            NSWorkspace.shared.open(url)
        }
    }
}
