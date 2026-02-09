import SwiftUI
import ScreenCaptureKit

struct AppInfo: Identifiable {
    let id: String // bundleIdentifier
    let name: String
    let icon: NSImage?
}

struct AppPickerView: View {
    @ObservedObject private var session = SessionManager.shared
    @State private var apps: [AppInfo] = []
    @State private var isLoading = true
    @State private var searchText = ""

    private var filteredApps: [AppInfo] {
        if searchText.isEmpty { return apps }
        return apps.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Select Application")
                .font(.caption)
                .foregroundStyle(.secondary)

            TextField("Search apps...", text: $searchText)
                .textFieldStyle(.roundedBorder)
                .font(.caption)

            if isLoading {
                HStack {
                    Spacer()
                    ProgressView().controlSize(.small)
                    Spacer()
                }
                .frame(height: 80)
            } else if filteredApps.isEmpty {
                Text("No apps found")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 8)
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(filteredApps) { app in
                            AppRow(app: app, isSelected: session.selectedAppBundleID == app.id)
                                .onTapGesture {
                                    session.selectedAppBundleID = app.id
                                }
                        }
                    }
                }
                .frame(maxHeight: 160)
            }
        }
        .task {
            await loadApps()
        }
    }

    private func loadApps() async {
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            let appInfos: [AppInfo] = content.applications.compactMap { scApp in
                let bundleID = scApp.bundleIdentifier
                guard !bundleID.isEmpty,
                      !scApp.applicationName.isEmpty else { return nil }
                let icon = NSRunningApplication.runningApplications(withBundleIdentifier: bundleID)
                    .first?.icon
                return AppInfo(id: bundleID, name: scApp.applicationName, icon: icon)
            }
            .filter { $0.id != Bundle.main.bundleIdentifier }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }

            await MainActor.run {
                self.apps = appInfos
                self.isLoading = false
                if let selected = session.selectedAppBundleID,
                   !appInfos.contains(where: { $0.id == selected }) {
                    session.selectedAppBundleID = nil
                }
            }
        } catch {
            await MainActor.run {
                self.isLoading = false
            }
        }
    }
}

struct AppRow: View {
    let app: AppInfo
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 8) {
            if let icon = app.icon {
                Image(nsImage: icon)
                    .resizable()
                    .frame(width: 20, height: 20)
            } else {
                Image(systemName: "app.fill")
                    .frame(width: 20, height: 20)
            }
            Text(app.name)
                .font(.body)
                .lineLimit(1)
            Spacer()
            if isSelected {
                Image(systemName: "checkmark")
                    .font(.caption)
                    .foregroundStyle(Color.accentColor)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(isSelected ? Color.blue.opacity(0.1) : Color.clear)
        )
        .contentShape(Rectangle())
    }
}
