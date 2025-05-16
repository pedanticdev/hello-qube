package fish.payara.resource;

import jakarta.json.bind.Jsonb;
import jakarta.json.bind.JsonbBuilder;
import jakarta.validation.constraints.NotNull;

import java.lang.reflect.Type;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;

public class RiddlesUtil {

    public static final String RIDDLE_REQUEST_SYSTEM_MESSAGE = """
            
            
            As an AI assistant, your task is to generate riddles about enterprise Java technologies. These riddles should educate sales agents about Java SE, Java/Jakarta EE, Spring, Quarkus, and their business value, especially relating to Payara Services Ltd.
            
            For each request, return a JSON array of Riddle objects (maximum 10), following this structure:
            {
              "riddles": [
                {
                  "id": "unique-identifier",
                  "hints": ["First hint", "Second hint", "Third hint"],
                  "question": "The actual riddle question",
                  "answer": "The answer to the riddle"
                }
              ]
            }
            
            Each riddle should:
            1. Be understandable to non-technical people
            2. Teach core concepts about Java enterprise technologies
            3. Connect these technologies to business value
            4. Relate to Payara when appropriate
            5. Be engaging and fun
            
            Make hints progressively more revealing, starting with subtle clues and ending with more direct guidance.
            
            Focus on explaining how these technologies help businesses deliver value to customers, emphasizing benefits like scalability, reliability, security, and cost-effectiveness.
            
            Avoid technical jargon when possible, or explain it clearly when needed.
            
            
            """;
    public static final String RIDDLE_REQUEST_SYSTEM_MESSAGE_2 = """
            
            **System Message:**
            
            You are tasked with generating a JSON list of riddles designed to educate users about enterprise Java technologies, including Java SE, Java/Jakarta EE, Spring, and Quarkus. These riddles will help non-technical sales agents at Payara Services Ltd better understand these technologies, their business value, and their relevance to Payara's offerings. Each riddle should be structured as an instance of the following Java `Riddle` record:
            
            ```java
            public record Riddle(String id, List<String> hints, String question, String answer) {
            }
            ```
            
            ### Instructions:
            1. **Objective**: Create up to 10 riddles that are fun, engaging, and educational. The riddles should clarify how these technologies work, their role in helping businesses deliver value to customers, and their significance for Payara Services Ltd.
            
            2. **Audience**: The riddles are intended for non-technical users (e.g., sales agents). Avoid overly technical jargon and ensure the language is accessible and clear.
            
            3. **Structure**:
               - **id**: A unique identifier for each riddle (e.g., "riddle-1", "riddle-2").
               - **hints**: Provide exactly three hints to guide the user toward the correct answer. Hints should progress from vague to more specific.
               - **question**: Formulate a clever and intriguing question that encapsulates the core concept being taught.
               - **answer**: Provide the correct answer to the riddle, written in simple terms.
            
            4. **Content Focus**:
               - Highlight key aspects of Java SE, Java/Jakarta EE, Spring, and Quarkus.
               - Explain how these technologies enable businesses to build scalable, reliable, and efficient applications.
               - Emphasize Payara's role in providing solutions based on these technologies.
            
            5. **Output Format**: Return the riddles as a JSON list of objects, where each object corresponds to a `Riddle` instance.
            
            ### Example Output:
            Here’s an example of what the JSON output might look like for one riddle:
            
            ```json
            [
              {
                "id": "riddle-1",
                "hints": [
                  "I am a foundation for building software.",
                  "I provide tools for creating everything from desktop apps to server-side systems.",
                  "My name includes 'Standard Edition'."
                ],
                "question": "What am I, the backbone of Java development, used by developers worldwide?",
                "answer": "Java SE (Standard Edition)"
              }
            ]
            ```
            
            ### Additional Notes:
            - Ensure each riddle is distinct and covers a different aspect of the technologies or their business implications.
            - Use creative and playful language to make the riddles enjoyable while maintaining educational value.
            - Balance simplicity with depth to ensure users learn meaningful concepts without feeling overwhelmed.
            
            Generate the full JSON list of riddles now!
            
            """;
    public static final String USER_PROMPT = """
            Generate a JSON list of riddles based on the instructions provided in the system message.
            """;
    private static final Jsonb JSON_BUILDER = JsonbBuilder.newBuilder().build();
    public static HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();


    private RiddlesUtil() {
    }

    public static String toJson(@NotNull final Object object) {
        return JSON_BUILDER.toJson(object);
    }

    public static <T> List<T> fromJson(@NotNull final String json, @NotNull final Type type) {
        return JSON_BUILDER.fromJson(json, type);
    }
    public static <T> T fromJson(@NotNull final String json, @NotNull final Class<T> type) {
        return (T) JSON_BUILDER.fromJson(json, type);
    }


    public static AiRiddleRequest generateRiddleRequest() {
        return new AiRiddleRequest(
                "gpt-4.1",
                List.of(
                        new AiRiddleRequest.Message("system", RIDDLE_REQUEST_SYSTEM_MESSAGE_2),
                        new AiRiddleRequest.Message("user", USER_PROMPT)
                ),
                0.7,
                2000
        );

    }

    public static String generateRequestBody() {
        return toJson(generateRiddleRequest());
    }
}
