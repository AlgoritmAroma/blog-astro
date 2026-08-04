import { notFound } from "next/navigation";
import { getPostById } from "@/lib/posts";
import { getCategories } from "@/lib/categories";
import PostForm from "../../PostForm";
import { updatePostAction } from "../../actions";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const postId = Number(id);
  const post = Number.isFinite(postId) ? await getPostById(postId) : null;
  if (!post) notFound();

  const categories = await getCategories();
  // A rubric that was deleted from the list but is still set on this article
  // must stay selectable, otherwise saving would silently move the post.
  const names = categories.map((category) => category.name);
  if (post.category && !names.includes(post.category)) names.unshift(post.category);

  return (
    <>
      <h1 style={{ marginBottom: 20 }}>Редактирование статьи</h1>
      {saved && <p className="admin-notice-success">Статья сохранена.</p>}
      <PostForm
        action={updatePostAction.bind(null, post.id)}
        initialValues={post}
        submitLabel="Сохранить"
        categories={names}
        draftKey={String(post.id)}
      />
    </>
  );
}
