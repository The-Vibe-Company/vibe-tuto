import SwiftUI

/// Dark studio upload progress panel.
struct UploadPanelView: View {
    let progress: Double
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(spacing: DT.Spacing.md) {
            Text("Recording complete")
                .font(DT.Typography.heading)
                .foregroundStyle(DT.Colors.textPrimary)

            HStack(spacing: DT.Spacing.sm) {
                Text(formattedDuration)
                    .font(DT.Typography.monoSmall)
                    .foregroundStyle(DT.Colors.textSecondary)
                Rectangle()
                    .fill(DT.Colors.border)
                    .frame(width: 1, height: 12)
                Text("\(session.stepCount) steps")
                    .font(DT.Typography.monoSmall)
                    .foregroundStyle(DT.Colors.textSecondary)
            }

            // Progress bar — warm gradient
            VStack(spacing: DT.Spacing.xs) {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(DT.Colors.elevated)
                            .frame(height: 6)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(DT.Colors.warmGradient)
                            .frame(width: max(0, geometry.size.width * progress), height: 6)
                            .animation(.easeInOut(duration: 0.3), value: progress)
                    }
                }
                .frame(height: 6)

                Text("Uploading... \(Int(progress * 100))%")
                    .font(DT.Typography.monoSmall)
                    .foregroundStyle(DT.Colors.textTertiary)
            }

            Button("Cancel") {
                session.reset()
            }
            .buttonStyle(GhostButtonStyle())
        }
        .padding(DT.Spacing.xl)
        .frame(width: DT.Size.panelWidth, height: DT.Size.panelHeight)
        .background(
            RoundedRectangle(cornerRadius: DT.Radius.lg)
                .fill(DT.Colors.card)
        )
        .overlay(
            RoundedRectangle(cornerRadius: DT.Radius.lg)
                .strokeBorder(DT.Colors.border, lineWidth: 1)
        )
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
        .preferredColorScheme(.dark)
    }

    private var formattedDuration: String {
        let minutes = Int(session.elapsedTime) / 60
        let seconds = Int(session.elapsedTime) % 60
        return "\(minutes):\(String(format: "%02d", seconds))"
    }
}

/// Dark studio completion panel.
struct CompletionPanelView: View {
    @ObservedObject private var session = SessionManager.shared
    @State private var appeared = false

    var body: some View {
        VStack(spacing: DT.Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 36))
                .foregroundStyle(DT.Colors.accentTeal)
                .shadow(color: DT.Colors.glowTeal, radius: 12)
                .scaleEffect(appeared ? 1.0 : 0.5)
                .opacity(appeared ? 1.0 : 0)

            Text("Upload complete")
                .font(DT.Typography.heading)
                .foregroundStyle(DT.Colors.textPrimary)

            HStack(spacing: DT.Spacing.md) {
                Button(action: openInEditor) {
                    Text("Open in Editor")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(StudioButtonStyle(accentBorder: DT.Colors.accentTeal))

                Button("Dismiss") {
                    session.reset()
                }
                .buttonStyle(GhostButtonStyle())
            }
        }
        .padding(DT.Spacing.xl)
        .frame(width: DT.Size.panelWidth, height: DT.Size.panelHeight)
        .background(
            RoundedRectangle(cornerRadius: DT.Radius.lg)
                .fill(DT.Colors.card)
        )
        .overlay(
            RoundedRectangle(cornerRadius: DT.Radius.lg)
                .strokeBorder(DT.Colors.border, lineWidth: 1)
        )
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
        .preferredColorScheme(.dark)
        .onAppear {
            withAnimation(DT.Anim.springBouncy) { appeared = true }
        }
    }

    private func openInEditor() {
        if let url = session.tutorialEditorURL {
            NSWorkspace.shared.open(url)
        }
        session.reset()
    }
}

/// Dark studio error panel.
struct ErrorPanelView: View {
    let message: String
    @ObservedObject private var session = SessionManager.shared

    var body: some View {
        VStack(spacing: DT.Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 28))
                .foregroundStyle(DT.Colors.accentAmber)
                .shadow(color: DT.Colors.glowAmber, radius: 8)

            Text("Upload failed")
                .font(DT.Typography.heading)
                .foregroundStyle(DT.Colors.textPrimary)

            Text(message)
                .font(DT.Typography.caption)
                .foregroundStyle(DT.Colors.textSecondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)

            HStack(spacing: DT.Spacing.md) {
                Button("Retry") {
                    session.retryUpload()
                }
                .buttonStyle(RecordButtonStyle())

                Button("Save Locally") {
                    session.reset()
                }
                .buttonStyle(GhostButtonStyle())
            }
        }
        .padding(DT.Spacing.xl)
        .frame(width: DT.Size.panelWidth, height: 190)
        .background(
            RoundedRectangle(cornerRadius: DT.Radius.lg)
                .fill(DT.Colors.card)
        )
        .overlay(
            RoundedRectangle(cornerRadius: DT.Radius.lg)
                .strokeBorder(DT.Colors.border, lineWidth: 1)
        )
        .shadow(color: DT.Shadow.floatingColor, radius: DT.Shadow.floatingRadius, y: DT.Shadow.floatingY)
        .preferredColorScheme(.dark)
    }
}
