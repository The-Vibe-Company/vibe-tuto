import SwiftUI

/// SwiftUI view for the menu bar dropdown panel.
struct MenuBarDropdownView: View {
    @ObservedObject private var session = SessionManager.shared
    @AppStorage("lastRecordingMode") private var lastMode: String = RecordingMode.fullScreen.rawValue

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("CapTuto Recorder")
                    .font(.headline)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 8)

            Divider()
                .padding(.horizontal, 12)

            // Record button
            Button(action: startRecording) {
                HStack {
                    Image(systemName: "record.circle")
                    Text("Record \(modeDisplayName)")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }
            .buttonStyle(.borderedProminent)
            .tint(.accentColor)
            .controlSize(.large)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .disabled(lastMode == RecordingMode.singleApp.rawValue && session.selectedAppBundleID == nil)
            .keyboardShortcut("r", modifiers: [.command, .shift])

            // Recording mode selector
            VStack(alignment: .leading, spacing: 6) {
                Text("Recording Mode")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Picker("", selection: $lastMode) {
                    Text("Full Screen").tag(RecordingMode.fullScreen.rawValue)
                    Text("Single App").tag(RecordingMode.singleApp.rawValue)
                    Text("Screen Region").tag(RecordingMode.region.rawValue)
                }
                .pickerStyle(.segmented)
                .labelsHidden()
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
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)

            // Options
            VStack(alignment: .leading, spacing: 4) {
                Text("Options")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Toggle(isOn: $session.micEnabled) {
                    Label("Audio narration (mic)", systemImage: "mic")
                        .font(.body)
                }
                .toggleStyle(.checkbox)

                Toggle(isOn: $session.actionDetectionEnabled) {
                    Label("Detect actions", systemImage: "hand.point.up.left")
                        .font(.body)
                }
                .toggleStyle(.checkbox)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)

            Divider()
                .padding(.horizontal, 12)

            // Recent recordings
            VStack(alignment: .leading, spacing: 4) {
                Text("Recent Recordings")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.top, 4)

                if recentRecordings.isEmpty {
                    Text("No recordings yet")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .padding(.vertical, 4)
                } else {
                    ForEach(recentRecordings, id: \.name) { recording in
                        HStack {
                            Text(recording.name)
                                .font(.body)
                                .lineLimit(1)
                            Spacer()
                            Text(recording.timeAgo)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Button(action: { openInEditor(recording) }) {
                                Image(systemName: "arrow.up.forward.square")
                                    .font(.caption)
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)

            Divider()
                .padding(.horizontal, 12)

            // Footer
            HStack {
                Button("Preferences...") {
                    NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
                }
                .buttonStyle(.plain)
                .font(.body)
                .foregroundStyle(.primary)

                Spacer()

                Button("Quit") {
                    NSApplication.shared.terminate(nil)
                }
                .buttonStyle(.plain)
                .font(.body)
                .foregroundStyle(.primary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
        .frame(width: 280)
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

    // Placeholder for recent recordings - would be loaded from LocalStore
    private var recentRecordings: [RecentRecording] {
        []
    }
}

struct RecentRecording {
    let name: String
    let timeAgo: String
    let editorURL: String
}
