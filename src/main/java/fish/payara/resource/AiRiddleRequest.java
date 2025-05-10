package fish.payara.resource;

import java.util.List;

public record AiRiddleRequest(String model,
                              List<Message> messages,
                              double temperature,
                              int max_tokens) {
    public record Message(
            String role,
            String content
    ) {
    }
}
