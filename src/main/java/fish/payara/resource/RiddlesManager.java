package fish.payara.resource;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.util.TypeLiteral;
import jakarta.inject.Inject;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import java.util.logging.Logger;

@ApplicationScoped
public class RiddlesManager {
    public static final ConcurrentHashMap<String, Set<Riddle>> RIDDLE_MAP = new ConcurrentHashMap<>();
    private static final Logger LOG = Logger.getLogger(RiddlesManager.class.getName());
    @Inject
    @ConfigProperty(name = "open.ai.key")
    private String openAiKey;
    @Inject
    @ConfigProperty(name = "api.url", defaultValue = "https://api.openai.com/v1/chat/completions")
    private String apiUrl;

    public RiddleResponse fetchRiddles(@NotNull String userId) {
        Set<Riddle> riddles = RIDDLE_MAP.get(userId);
        if (!riddles.isEmpty()) {
            return new RiddleResponse(riddles);
        }
        riddles = Set.copyOf(fetchRiddles());
        RIDDLE_MAP.put(userId, riddles);
        return new RiddleResponse(riddles);

    }

    private List<Riddle> fetchRiddles() {
        String requestBody = RiddlesUtil.generateRequestBody();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl))
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + openAiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();
        // Send request and handle response
        HttpResponse<String> response = null;

        try {
            response = RiddlesUtil.HTTP_CLIENT.send(request,
                    HttpResponse.BodyHandlers.ofString());
        } catch (IOException | InterruptedException e) {
            LOG.log(Level.SEVERE, "Error sending request to OpenAI", e);
        }
        if (response != null && response.statusCode() == Response.Status.OK.getStatusCode()) {
            LOG.log(Level.INFO, "Response status code: {0}", response.statusCode());
            LOG.log(Level.INFO, "Response body: {0}", response.body());
            return RiddlesUtil.fromJson(response.body(), new TypeLiteral<List<Riddle>>() {
            }.getType());
        }

        return List.of();
    }

}
