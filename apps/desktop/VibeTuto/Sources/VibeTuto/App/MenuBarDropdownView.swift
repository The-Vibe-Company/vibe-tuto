import SwiftUI

/// Dark studio control panel — the main menu bar dropdown.
struct MenuBarDropdownView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("lastRecordingMode") private var lastMode: String = RecordingMode.fullScreen.rawValue

    private let modes: [(mode: RecordingMode, label: String)] = [
        (.fullScreen, "Full Screen"),
        (.singleApp, "Single App"),
        (.region, "Region"),
    ]

    var body: some View {
        VStack(spacing: 0) {
            // ── Header ──
            HStack(spacing: DT.Spacing.sm) {
                // ON AIR indicator
                Circle()
                    .fill(DT.Colors.accentRed)
                    .frame(width: 6, height: 6)
                    .shadow(color: DT.Colors.glowRed, radius: 4)

                VStack(alignment: .leading, spacing: 1) {
                    Text("CAPTUTO")
                        .font(DT.Typography.sectionLabel)
                        .tracking(2)
                        .foregroundStyle(DT.Colors.textSecondary)
                    Text("Recorder")
                        .font(DT.Typography.heading)
                        .foregroundStyle(DT.Colors.textPrimary)
                }

                Spacer()
            }
            .padding(.horizontal, DT.Spacing.lg)
            .padding(.top, DT.Spacing.lg)
            .padding(.bottom, DT.Spacing.md)

            studioDivider

            // ── Record Button ──
            Button(action: startRecording) {
                HStack(spacing: DT.Spacing.sm) {
                    Image(systemName: "record.circle.fill")
                        .font(.system(size: 16))
                    Text("Record \(modeDisplayName)")
                }
            }
            .buttonStyle(RecordButtonStyle())
            .padding(.horizontal, DT.Spacing.lg)
            .padding(.vertical, DT.Spacing.md)
            .disabled(lastMode == RecordingMode.singleApp.rawValue && session.selectedAppBundleID == nil)
            .keyboardShortcut("r", modifiers: [.command, .shift])

            // ── Mode Picker ──
            VStack(alignment: .leading, spacing: DT.Spacing.sm) {
                SectionHeader(title: "Mode")

                // Custom capsule picker
                HStack(spacing: DT.Spacing.xs) {
                    ForEach(modes, id: \.mode) { item in
                        ModeCapsule(
                            label: item.label,
                            isSelected: lastMode == item.mode.rawValue
                        ) {
                            withAnimation(DT.Anim.springSnappy) {
                                lastMode = item.mode.rawValue
                            }
                        }
                    }
                }
                .padding(DT.Spacing.xs)
                .background(
                    RoundedRectangle(cornerRadius: DT.Radius.md)
                        .fill(DT.Colors.surface)
                )
                .onChange(of: lastMode) { _, newMode in
                    if newMode != RecordingMode.singleApp.rawValue {
                        session.selectedAppBundleID = nil
                    }
                    if newMode != RecordingMode.region.rawValue {
                        session.selectedRegion = nil
                    }
                }

                if lastMode == RecordingMode.singleApp.rawValue {
                    AppPickerView()
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .padding(.horizontal, DT.Spacing.lg)
            .padding(.bottom, DT.Spacing.md)

            studioDivider

            // ── Options ──
            VStack(alignment: .leading, spacing: DT.Spacing.sm) {
                SectionHeader(title: "Options")

                StudioToggle(
                    isOn: $session.micEnabled,
                    icon: "mic.fill",
                    label: "Audio narration",
                    activeColor: DT.Colors.accentRed
                )

                StudioToggle(
                    isOn: $session.actionDetectionEnabled,
                    icon: "hand.point.up.left.fill",
                    label: "Detect actions",
                    activeColor: DT.Colors.accentTeal
                )
            }
            .padding(.horizontal, DT.Spacing.lg)
            .padding(.bottom, DT.Spacing.md)

            studioDivider

            // ── Recent Recordings ──
            VStack(alignment: .leading, spacing: DT.Spacing.xs) {
                SectionHeader(title: "Recent")
                    .padding(.top, DT.Spacing.xs)

                if recentRecordings.isEmpty {
                    Text("No recordings yet")
                        .font(DT.Typography.caption)
                        .foregroundStyle(DT.Colors.textTertiary)
                        .padding(.vertical, DT.Spacing.xs)
                } else {
                    ForEach(recentRecordings, id: \.name) { recording in
                        HStack {
                            Text(recording.name)
                                .font(DT.Typography.body)
                                .foregroundStyle(DT.Colors.textPrimary)
                                .lineLimit(1)
                            Spacer()
                            Text(recording.timeAgo)
                                .font(DT.Typography.monoSmall)
                                .foregroundStyle(DT.Colors.textTertiary)
                            Button(action: { openInEditor(recording) }) {
                                Image(systemName: "arrow.up.forward.square")
                                    .font(.system(size: 12))
                                    .foregroundStyle(DT.Colors.textSecondary)
                            }
                            .buttonStyle(GhostButtonStyle())
                        }
                        .padding(.vertical, DT.Spacing.xxs)
                    }
                }
            }
            .padding(.horizontal, DT.Spacing.lg)
            .padding(.bottom, DT.Spacing.sm)

            studioDivider

            // ── Footer ──
            HStack {
                Button(action: {
                    NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
                }) {
                    Label("Preferences", systemImage: "gearshape")
                }
                .buttonStyle(GhostButtonStyle())

                Spacer()

                Button("Quit") {
                    NSApplication.shared.terminate(nil)
                }
                .buttonStyle(GhostButtonStyle())
            }
            .padding(.horizontal, DT.Spacing.md)
            .padding(.vertical, DT.Spacing.sm)
        }
        .frame(width: DT.Size.dropdownWidth)
        .background(DT.Colors.surface)
        .preferredColorScheme(.dark)
    }

    // MARK: - Helpers

    private var studioDivider: some View {
        Rectangle()
            .fill(DT.Colors.border)
            .frame(height: 1)
            .padding(.horizontal, DT.Spacing.md)
    }

    private var modeDisplayName: String {
        switch RecordingMode(rawValue: lastMode) ?? .fullScreen {
        case .fullScreen: return "Full Screen"
        case .singleApp: return "Single App"
        case .region: return "Region"
        }
    }

    private func startRecording() {
        session.currentMode = RecordingMode(rawValue: lastMode) ?? .fullScreen
        session.startRecording()
    }

    private func openInEditor(_ recording: RecentRecording) {
        if let url = URL(string: recording.editorURL) {
            NSWorkspace.shared.open(url)
        }
    }

    private var recentRecordings: [RecentRecording] {
        []
    }
}

// MARK: - Custom Components

/// Capsule-style mode selector button.
struct ModeCapsule: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Text(label)
            .font(DT.Typography.monoSmall)
            .foregroundStyle(isSelected ? DT.Colors.textPrimary : DT.Colors.textSecondary)
            .padding(.horizontal, DT.Spacing.md)
            .padding(.vertical, DT.Spacing.xs + 2)
            .background(
                RoundedRectangle(cornerRadius: DT.Radius.sm)
                    .fill(isSelected ? DT.Colors.elevated : .clear)
            )
            .contentShape(Rectangle())
            .onTapGesture { action() }
    }
}

/// Custom toggle with colored indicator dot.
struct StudioToggle: View {
    @Binding var isOn: Bool
    let icon: String
    let label: String
    var activeColor: Color = DT.Colors.accentRed

    @State private var isHovering = false

    var body: some View {
        HStack(spacing: DT.Spacing.sm) {
            // Indicator dot
            Circle()
                .fill(isOn ? activeColor : DT.Colors.border)
                .frame(width: 8, height: 8)
                .shadow(color: isOn ? activeColor.opacity(0.4) : .clear, radius: 4)

            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(isOn ? DT.Colors.textPrimary : DT.Colors.textTertiary)
                .frame(width: 16)

            Text(label)
                .font(DT.Typography.body)
                .foregroundStyle(isOn ? DT.Colors.textPrimary : DT.Colors.textSecondary)

            Spacer()
        }
        .padding(.horizontal, DT.Spacing.sm)
        .padding(.vertical, DT.Spacing.xs + 1)
        .background(
            RoundedRectangle(cornerRadius: DT.Radius.sm)
                .fill(isHovering ? DT.Colors.card : .clear)
        )
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(DT.Anim.springSnappy) { isOn.toggle() }
        }
        .onHover { hovering in
            withAnimation(DT.Anim.fadeQuick) { isHovering = hovering }
        }
    }
}

struct RecentRecording {
    let name: String
    let timeAgo: String
    let editorURL: String
}
