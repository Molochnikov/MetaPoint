import { ILinkGroup } from ".";
import { IPortalFooterEditResult } from "./IPortalFooterEditResult";

export interface IPortalFooterProps {
    links: ILinkGroup[];
    copyright: string;
    support: string;
    editable: boolean;
    onLinksEdit: () => Promise<IPortalFooterEditResult>;
}