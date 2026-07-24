import { notFound } from "next/navigation";
import { getPostById } from "@/lib/posts";
import PostForm from "../../PostForm";
import { updatePostAction } from "../../actions";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);
  const post = Number.isFinite(postId) ? getPostById(postId) : null;
  if (!post) notFound();

  return (
    <>
      <h1 style={{ marginBottom: 20 }}>Редактирование статьи</h1>
      <PostForm action={updatePostAction.bind(null, post.id)} initialValues={post} submitLabel="Сохранить" />
    </>
  );
}
