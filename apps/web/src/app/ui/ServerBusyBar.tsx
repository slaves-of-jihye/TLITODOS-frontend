import { useServerBusy } from "@/shared/api";
import { BusyBar } from "@/shared/ui";

export const ServerBusyBar = () => <BusyBar busy={useServerBusy()} label="서버와 주고받는 중" />;
