package fish.payara.resource;

public record StatResponse(int correctAnswers, int currentStreak, int hintsUsed, int currentIndex) {
}
