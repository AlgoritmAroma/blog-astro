import { AUTHOR } from "@/lib/author";

export default function AuthorBox() {
  return (
    <div className="author-box">
      <div className="author-box__avatar" aria-hidden="true">
        {AUTHOR.avatarInitials}
      </div>
      <div>
        <div className="author-box__name">{AUTHOR.name}</div>
        <div className="author-box__role">{AUTHOR.role}</div>
        <p className="author-box__bio">{AUTHOR.bio}</p>
      </div>
    </div>
  );
}
