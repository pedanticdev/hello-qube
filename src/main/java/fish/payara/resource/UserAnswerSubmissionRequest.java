package fish.payara.resource;

import jakarta.validation.constraints.NotEmpty;

public record UserAnswerSubmissionRequest(String userId, String riddleId, @NotEmpty String answer, Long timeSpent) {
}
