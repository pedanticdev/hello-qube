package fish.payara.resource;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.logging.Logger;

@Path("riddles")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RiddleResource {
    private static final Logger LOG = Logger.getLogger(RiddleResource.class.getName());

    @Inject
    RiddlesManager riddlesManager;

    @Path("{userId}")
    @GET
    public RiddleResponse fetchRiddles(@NotEmpty @PathParam("userId") String userId) {
        LOG.info("Fetching riddles for user: " + userId);
        return riddlesManager.fetchRiddles(userId);
    }

    @Path("submit")
    @POST
    public UserAnswerSubmissionResponse submitAnswer(@Valid UserAnswerSubmissionRequest request) {
        //TODO: Save answer to model
        return new UserAnswerSubmissionResponse(false, "");
    }
}
