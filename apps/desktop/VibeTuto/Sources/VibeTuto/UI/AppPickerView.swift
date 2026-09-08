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
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: DT.Spacing.sm) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                TextField("Search apps", text: $searchText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12))
                    .foregroundStyle(.primary)
                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .fill(Color(nsColor: .textBackgroundColor))
            )

            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                        .controlSize(.small)
                        .tint(DT.Colors.textSecondary)
                    Spacer()
                }
                .frame(height: 80)
            } else if filteredApps.isEmpty {
                Text("No apps found")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, DT.Spacing.sm)
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(filteredApps) { app in
                            AppRow(app: app, isSelected: session.selectedAppBundleID == app.id)
                                .onTapGesture {
                                    withAnimation(.easeOut(duration: 0.16)) {
                                        session.selectedAppBundleID = app.id
                                    }
                                    NSRunningApplication.runningApplications(withBundleIdentifier: app.id)
                                        .first?
                                        .activate()
                                }
                        }
                    }
                }
                .frame(maxHeight: 140)
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
    @State private var isHovering = false

    var body: some View {
        HStack(spacing: DT.Spacing.sm + 2) {
            if let icon = app.icon {
                Image(nsImage: icon)
                    .resizable()
                    .frame(width: DT.Size.appIconSize, height: DT.Size.appIconSize)
            } else {
                Image(systemName: "app.fill")
                    .frame(width: DT.Size.appIconSize, height: DT.Size.appIconSize)
                    .foregroundStyle(DT.Colors.textTertiary)
            }
            Text(app.name)
                .font(.system(size: 13))
                .foregroundStyle(.primary)
                .lineLimit(1)
            Spacer()
            if isSelected {
                Image(systemName: "checkmark")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Color.accentColor)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(
                    isSelected ? Color.accentColor.opacity(0.12) :
                    isHovering ? Color(nsColor: .separatorColor).opacity(0.15) : .clear
                )
        )
        .contentShape(Rectangle())
        .onHover { hovering in
            withAnimation(.easeOut(duration: 0.15)) { isHovering = hovering }
        }
    }
}
