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
        VStack(alignment: .leading, spacing: DT.Spacing.sm) {
            HStack(spacing: DT.Spacing.sm) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11))
                    .foregroundStyle(Color(nsColor: .secondaryLabelColor))
                TextField("Search apps", text: $searchText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12))
                    .foregroundStyle(.primary)
                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(Color(nsColor: .secondaryLabelColor))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.white.opacity(0.035))
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
                    .font(DT.Typography.caption)
                    .foregroundStyle(DT.Colors.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, DT.Spacing.sm)
            } else {
                ScrollView {
                    LazyVStack(spacing: 6) {
                        ForEach(filteredApps) { app in
                            AppRow(app: app, isSelected: session.selectedAppBundleID == app.id)
                                .onTapGesture {
                                    withAnimation(.easeOut(duration: 0.16)) {
                                        session.selectedAppBundleID = app.id
                                    }
                                }
                        }
                    }
                }
                .frame(height: 140)
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
                    .foregroundStyle(.primary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(
                    isSelected ? Color.white.opacity(0.10) :
                    isHovering ? Color.white.opacity(0.05) : .clear
                )
        )
        .contentShape(Rectangle())
        .onHover { hovering in
            withAnimation(.easeOut(duration: 0.15)) { isHovering = hovering }
        }
    }
}
