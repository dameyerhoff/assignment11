import { PostList } from "../components/PostList";

// This part tells the internet browser what to write on the little tab at the top of the screen.
export const metadata = {
  title: "Feed | Upvote",
  description: "Check out the latest posts on Upvote.",
};

export default async function Home() {
  // This just shows the list of all the posts people have made.
  return <PostList />;
}
