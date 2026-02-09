import SwiftUI
import AVFoundation

/// SwiftUI view for the dark studio Preferences window with 4 tabs.
struct PreferencesView: View {
    var body: some View {
        TabView {
            GeneralPreferencesView()
                .tabItem {
                    Label("General", systemImage: "gearshape")
                }

            ShortcutsPreferencesView()
                .tabItem {
                    Label("Shortcuts", systemImage: "keyboard")
                }

            AudioPreferencesView()
                .tabItem {
                    Label("Audio", systemImage: "mic")
                }

            AdvancedPreferencesView()
                .tabItem {
                    Label("Advanced", systemImage: "wrench.and.screwdriver")
                }
        }
        .padding(DT.Spacing.xl)
        .background(DT.Colors.surface)
        .preferredColorScheme(.dark)
    }
}

// MARK: - General Tab

struct GeneralPreferencesView: View {
    @AppStorage("apiToken") private var apiToken = ""
    @AppStorage("launchAtLogin") private var launchAtLogin = false
    @AppStorage("showDockIcon") private var showDockIcon = false
    @AppStorage("showCountdown") private var showCountdown = true
    @AppStorage("countdownDuration") private var countdownDuration = 3
    @AppStorage("autoOpenEditor") private var autoOpenEditor = false
    @AppStorage("captureQuality") private var captureQuality = "standard"

    var body: some View {
        Form {
            Section("Startup") {
                Toggle("Launch at login", isOn: $launchAtLogin)
                    .tint(DT.Colors.accentRed)
                Toggle("Show Dock icon", isOn: $showDockIcon)
                    .tint(DT.Colors.accentRed)
            }

            Section("Recording") {
                Toggle("Show countdown before recording", isOn: $showCountdown)
                    .tint(DT.Colors.accentRed)
                if showCountdown {
                    Picker("Countdown duration", selection: $countdownDuration) {
                        Text("3 seconds").tag(3)
                        Text("5 seconds").tag(5)
                    }
                }
                Toggle("Auto-open editor after upload", isOn: $autoOpenEditor)
                    .tint(DT.Colors.accentRed)
                Picker("Capture quality", selection: $captureQuality) {
                    Text("Standard (1x)").tag("standard")
                    Text("High (2x Retina)").tag("high")
                }
            }

            Section("Account") {
                VStack(alignment: .leading, spacing: DT.Spacing.sm) {
                    Text("API Token")
                        .font(DT.Typography.body)
                        .foregroundStyle(DT.Colors.textPrimary)
                    SecureField("Paste your API token here", text: $apiToken)
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
                    HStack {
                        if !apiToken.isEmpty {
                            Label("Token saved", systemImage: "checkmark.circle.fill")
                                .font(DT.Typography.caption)
                                .foregroundStyle(DT.Colors.accentTeal)
                        }
                        Spacer()
                        Button("Get Token") {
                            let baseURL = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "https://captuto.com"
                            if let url = URL(string: "\(baseURL)/settings") {
                                NSWorkspace.shared.open(url)
                            }
                        }
                        .buttonStyle(.plain)
                        .font(DT.Typography.caption)
                        .foregroundStyle(DT.Colors.accentBlue)
                    }
                }
            }
        }
        .formStyle(.grouped)
    }
}

// MARK: - Shortcuts Tab

struct ShortcutsPreferencesView: View {
    @AppStorage("shortcutRecord") private var shortcutRecord = "Cmd+Shift+R"
    @AppStorage("shortcutPause") private var shortcutPause = "Cmd+Shift+P"
    @AppStorage("shortcutMarker") private var shortcutMarker = "Cmd+Shift+M"

    var body: some View {
        Form {
            Section("Global Keyboard Shortcuts") {
                shortcutRow(label: "Start/Stop Recording", shortcut: shortcutRecord)
                shortcutRow(label: "Pause/Resume", shortcut: shortcutPause)
                shortcutRow(label: "Add Marker", shortcut: shortcutMarker)
            }

            Text("Click a shortcut to change it. Press Escape to clear.")
                .font(DT.Typography.caption)
                .foregroundStyle(DT.Colors.textTertiary)
        }
        .formStyle(.grouped)
    }

    private func shortcutRow(label: String, shortcut: String) -> some View {
        HStack {
            Text(label)
                .font(DT.Typography.body)
                .foregroundStyle(DT.Colors.textPrimary)
            Spacer()
            // Keycap style badge
            HStack(spacing: 2) {
                ForEach(shortcut.components(separatedBy: "+"), id: \.self) { key in
                    Text(key)
                        .font(DT.Typography.monoSmall)
                        .foregroundStyle(DT.Colors.textPrimary)
                        .padding(.horizontal, DT.Spacing.sm)
                        .padding(.vertical, DT.Spacing.xs)
                        .background(
                            RoundedRectangle(cornerRadius: DT.Radius.sm)
                                .fill(DT.Colors.card)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: DT.Radius.sm)
                                .strokeBorder(DT.Colors.border, lineWidth: 1)
                        )
                }
            }
        }
    }
}

// MARK: - Audio Tab

struct AudioPreferencesView: View {
    @AppStorage("noiseReduction") private var noiseReduction = true
    @State private var selectedDevice = "Default"
    @State private var audioLevel: Float = 0.0

    var body: some View {
        Form {
            Section("Input Device") {
                Picker("Microphone", selection: $selectedDevice) {
                    Text("Default").tag("Default")
                }
            }

            Section("Processing") {
                Toggle("Noise reduction", isOn: $noiseReduction)
                    .tint(DT.Colors.accentRed)
            }

            Section("Level Meter") {
                // Custom gradient audio meter
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(DT.Colors.elevated)
                            .frame(height: 8)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(
                                LinearGradient(
                                    colors: [DT.Colors.accentTeal, DT.Colors.accentBlue],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: max(0, geometry.size.width * CGFloat(audioLevel)), height: 8)
                            .animation(.easeOut(duration: 0.1), value: audioLevel)
                    }
                }
                .frame(height: 8)

                Text("Speak to test your microphone level")
                    .font(DT.Typography.caption)
                    .foregroundStyle(DT.Colors.textTertiary)
            }
        }
        .formStyle(.grouped)
    }
}

// MARK: - Advanced Tab

struct AdvancedPreferencesView: View {
    @AppStorage("detectionSensitivity") private var sensitivity = 1 // 0=Low, 1=Medium, 2=High
    @AppStorage("groupingDelay") private var groupingDelay = 500.0
    @AppStorage("apiBaseURL") private var apiBaseURL = "https://captuto.com"

    var body: some View {
        Form {
            Section("Action Detection") {
                Picker("Sensitivity", selection: $sensitivity) {
                    Text("Low").tag(0)
                    Text("Medium").tag(1)
                    Text("High").tag(2)
                }
                .pickerStyle(.segmented)

                VStack(alignment: .leading) {
                    Text("Step grouping delay: \(Int(groupingDelay))ms")
                        .font(DT.Typography.monoSmall)
                        .foregroundStyle(DT.Colors.textSecondary)
                    Slider(value: $groupingDelay, in: 200...2000, step: 100)
                        .tint(DT.Colors.accentRed)
                }
            }

            Section("Server") {
                TextField("API URL", text: $apiBaseURL)
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
            }

            Section("Data") {
                Button("Clear Local Cache") {
                    clearCache()
                }
                .buttonStyle(GhostButtonStyle())

                Button("Reset All Preferences") {
                    resetPreferences()
                }
                .foregroundStyle(DT.Colors.accentRed)
                .padding(.horizontal, DT.Spacing.md)
                .padding(.vertical, DT.Spacing.xs)
                .background(
                    RoundedRectangle(cornerRadius: DT.Radius.sm)
                        .fill(DT.Colors.accentRed.opacity(0.1))
                )
            }
        }
        .formStyle(.grouped)
    }

    private func clearCache() {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("VibeTuto", isDirectory: true)
        try? FileManager.default.removeItem(at: tempDir)
    }

    private func resetPreferences() {
        let domain = Bundle.main.bundleIdentifier ?? "com.vibetuto.recorder"
        UserDefaults.standard.removePersistentDomain(forName: domain)
    }
}
