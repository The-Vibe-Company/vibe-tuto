import Foundation

/// Accessibility information about a UI element at the point of interaction.
struct ElementInfo: Codable, Sendable {
    let role: String
    let title: String?
    let value: String?
    let parentChain: [String]
    let context: [String: String]?

    init(
        role: String,
        title: String?,
        value: String?,
        parentChain: [String],
        context: [String: String]? = nil
    ) {
        self.role = role
        self.title = title
        self.value = value
        self.parentChain = parentChain
        self.context = context
    }

    enum CodingKeys: String, CodingKey {
        case role
        case title
        case value
        case parentChain = "parent_chain"
        case context
    }
}
