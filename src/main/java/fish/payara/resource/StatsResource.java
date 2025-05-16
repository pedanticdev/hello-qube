package fish.payara.resource;


import jakarta.validation.constraints.NotEmpty;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("stats")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class StatsResource {

    @Path("{userId}")
    @GET
    public StatResponse fetchStats(@PathParam("userId") @NotEmpty String userId) {
        return new StatResponse(0, 0, 0, 0);
    }

    @Path("update")
    @POST
    public Response updateStats(SaveStatRequest request) {
        return Response.ok().build();
    }
}
