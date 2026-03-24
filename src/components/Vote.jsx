import { db } from "@/db";
import auth from "../app/middleware";
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
  if (!userId) return; // Silent fail if no user (Login button handles the prompt)

  const existingVote = await getExistingVote(userId, postId);

  try {
    if (existingVote) {
      if (existingVote.vote === newVote) {
        // User is toggling their vote off
        await db.query("DELETE FROM votes WHERE id = $1", [existingVote.id]);
      } else {
        // User is switching from up to down (or vice versa)
        await db.query("UPDATE votes SET vote = $1 WHERE id = $2", [
          newVote,
          existingVote.id,
        ]);
      }
    } else {
      // New vote - the UNIQUE constraint in SQL prevents duplicates here
      await db.query(
        "INSERT INTO votes (user_id, post_id, vote, vote_type) VALUES ($1, $2, $3, 'post')",
        [userId, postId, newVote],
      );
    }
  } catch (error) {
    console.error("Database rejected vote:", error.message);
    // Gracefully catch any UNIQUE constraint violations
  }

  revalidatePath(`/post/${postId}`);
  revalidatePath("/");
}

export async function Vote({ postId, votes }) {
  const session = await auth();
  const userId = session?.user?.id;
  const existingVote = await getExistingVote(userId, postId);

  async function upvote() {
    "use server";
    if (!userId) return;
    await handleVote(userId, postId, 1);
  }

  async function downvote() {
    "use server";
    if (!userId) return;
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
