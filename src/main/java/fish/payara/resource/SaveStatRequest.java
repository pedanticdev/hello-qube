package fish.payara.resource;

public record SaveStatRequest(String userId, int correctAnswers, int currentStreak, String lastUpdated,
                              int currentRiddleIndex) {
}
