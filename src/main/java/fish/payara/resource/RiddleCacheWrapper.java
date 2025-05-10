package fish.payara.resource;

import java.time.Instant;
import java.util.Set;

public record RiddleCacheWrapper(Set<Riddle> riddles, Instant lastUpdated) {
}
