import { Avatar, AvatarFallback } from "./ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";

export default function ResponsibleUsersButton({ users = [], getUserInfo }) {
  if (!users?.length) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="task-responsible">
          {users.map((username) => {
            const info = getUserInfo(username);
            return (
              <Avatar key={username} className="avatar-badge">
                <AvatarFallback>{info?.avatar || "👤"}</AvatarFallback>
              </Avatar>
            );
          })}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        {users.map((username) => {
          const info = getUserInfo(username);
          return (
            <div key={username} className="responsible-user-detail">
              <span className="detail-avatar">{info?.avatar || "👤"}</span>
              <span>{info?.displayName || username}</span>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

