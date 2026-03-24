import { CommentForm } from "@/components/CommentForm";
import { CommentList } from "@/components/CommentList";
import { Vote } from "@/components/Vote";
import { db } from "@/db";

// This looks at the post you clicked and puts the post's name on the browser tab.
export async function generateMetadata({ params }) {
  const { rows: posts } = await db.query(
    "SELECT title FROM posts WHERE id = $1 LIMIT 1",
    [params.postId],
  );

  const post = posts[0];

  return {
    title: post ? `${post.title} | Upvote` : "Post Not Found | Upvote",
  };
}

export default async function SinglePostPage({ params }) {
  const postId = params.postId;

  // This asks the database for the post's words, the name of the person who wrote it, and the score.
  const { rows: posts } = await db.query(
    `SELECT posts.id, posts.title, posts.body, posts.created_at, users.name, 
    COALESCE(SUM(votes.vote), 0) AS vote_total
    FROM posts
    JOIN users ON posts.user_id = users.id
    LEFT JOIN votes ON votes.post_id = posts.id
    WHERE posts.id = $1
    GROUP BY posts.id, users.name
    LIMIT 1;`,
    [postId],
  );
  const post = posts[0];

  const { rows: votes } = await db.query(
    `SELECT *, users.name from votes
     JOIN users on votes.user_id = users.id`,
  );

  return (
    <div className="max-w-screen-lg mx-auto pt-4 pr-4">
      <div className="flex space-x-6">
        {/* These are the up and down buttons and the score number. */}
        <Vote postId={post.id} votes={post.vote_total} />
        <div className="">
          <h1 className="text-2xl">{post.title}</h1>
          <p className="text-zinc-400 mb-4">Posted by {post.name}</p>
        </div>
      </div>
      <main className="whitespace-pre-wrap m-4 text-white">{post.body}</main>

      {/* These show the comment box and the list of messages below the post. */}
      <CommentForm postId={post.id} />
      <CommentList postId={post.id} />
    </div>
  );
}
