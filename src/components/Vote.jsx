import { db } from "@/db";
import { auth } from "@/auth"; // Updated to the standard NextAuth@beta export
import { revalidatePath } from "next/cache";
import { VoteButtons } from "./VoteButtons";

async function getExistingVote(userId, postId) {
  if (!userId) return null;
  const { rows: existingVotes } = await db.query(
    "SELECT * FROM votes WHERE user_id = $1 AND post_id = $2 LIMIT 1",
    [userId, postId],
  );
  return existingVotes?.[0];
}

async function handleVote(userId, postId, newVote) {
  // If the user isn't logged in, we shouldn't even reach this logic
  // because of the check in the server actions below.
  if (!userId) return;

  const existingVote = await getExistingVote(userId, postId);

  try {
    if (existingVote) {
      if (existingVote.vote === newVote) {
        await db.query("DELETE FROM votes WHERE id = $1", [existingVote.id]);
      } else {
        await db.query("UPDATE votes SET vote = $1 WHERE id = $2", [
          newVote,
          existingVote.id,
        ]);
      }
    } else {
      // The database 'unique_post_vote' constraint will prevent
      // a user from inserting two rows for the same post.
      await db.query(
        "INSERT INTO votes (user_id, post_id, vote, vote_type) VALUES ($1, $2, $3, 'post')",
        [userId, postId, newVote],
      );
    }
  } catch (error) {
    // Handling the unique constraint error specifically
    if (error.code === "23505") {
      console.error("User has already voted on this post.");
    } else {
      console.error("The vote didn't save:", error.message);
    }
  }

  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
}

export async function Vote({ postId, votes }) {
  const session = await auth();
  const userId = session?.user?.id;
  const existingVote = await getExistingVote(userId, postId);

  // Requirement: Handle error when voting while not logged in
  async function upvote() {
    "use server";
    if (!userId) {
      // Instead of a silent return, we can throw an error or redirect.
      // For a 'nice error message', we'll rely on the UI or a redirect to login.
      throw new Error("You must be logged in to upvote!");
    }
    await handleVote(userId, postId, 1);
  }

  async function downvote() {
    "use server";
    if (!userId) {
      throw new Error("You must be logged in to downvote!");
    }
    await handleVote(userId, postId, -1);
  }

  return (
    <>
      <form className="flex items-center space-x-3 pl-3">
        <VoteButtons
          upvote={upvote}
          downvote={downvote}
          votes={votes}
          existingVote={existingVote}
        />
      </form>
    </>
  );
}
