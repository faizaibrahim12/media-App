import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    };
  };
  currentUserId: string | undefined;
  onDelete: () => void;
}

const PostCard = ({ post, currentUserId, onDelete }: PostCardProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComment, setIsLoadingComment] = useState(false);

  useEffect(() => {
    fetchLikesAndComments();
    if (currentUserId) {
      checkIfLiked();
    }
  }, [post.id, currentUserId]);

  const fetchLikesAndComments = async () => {
    const { data: likes } = await supabase
      .from("likes")
      .select("*")
      .eq("post_id", post.id);
    
    const { data: comments } = await supabase
      .from("comments")
      .select("*, profiles(username, avatar_url, full_name)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    setLikesCount(likes?.length || 0);
    setCommentsCount(comments?.length || 0);
    setComments(comments || []);
  };

  const checkIfLiked = async () => {
    if (!currentUserId) return;
    
    const { data } = await supabase
      .from("likes")
      .select("*")
      .eq("post_id", post.id)
      .eq("user_id", currentUserId)
      .single();

    setIsLiked(!!data);
  };

  const handleLike = async () => {
    if (!currentUserId) {
      toast.error("Please log in to like posts");
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await supabase
          .from("likes")
          .insert({ post_id: post.id, user_id: currentUserId });
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to like post");
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !newComment.trim()) return;

    setIsLoadingComment(true);
    try {
      const { error } = await supabase.from("comments").insert({
        post_id: post.id,
        user_id: currentUserId,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      fetchLikesAndComments();
      toast.success("Comment added!");
    } catch (error: any) {
      toast.error(error.message || "Failed to add comment");
    } finally {
      setIsLoadingComment(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;
      toast.success("Post deleted!");
      onDelete();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete post");
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => navigate(`/profile/${post.user_id}`)}
          >
            <Avatar>
              <AvatarImage src={post.profiles.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {post.profiles.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{post.profiles.full_name || post.profiles.username}</p>
              <p className="text-sm text-muted-foreground">
                @{post.profiles.username} · {formatDistanceToNow(new Date(post.created_at))} ago
              </p>
            </div>
          </div>
          {currentUserId === post.user_id && (
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{post.content}</p>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <div className="flex gap-4 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={isLiked ? "text-destructive" : ""}
          >
            <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
            {likesCount}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {commentsCount}
          </Button>
        </div>
        
        {showComments && (
          <div className="w-full space-y-4">
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {comment.profiles?.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {comment.profiles?.full_name || comment.profiles?.username}
                    </p>
                    <p className="text-sm">{comment.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(comment.created_at))} ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleComment} className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] resize-none"
                disabled={isLoadingComment}
              />
              <Button type="submit" size="icon" disabled={isLoadingComment || !newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default PostCard;