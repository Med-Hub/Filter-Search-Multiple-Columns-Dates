// Adapted from DataBrothers src/services/textSearchFilterService.ts (MIT).
// Retains instance-owned host, general/filter application, and clear behaviour.
// The upstream one-column Contains construction is replaced by a tested wire filter.
import type powerbi from "powerbi-visuals-api";
import { FilterSink } from "../core/controller";
import { WireFilter } from "../core/types";
type IVisualHost = powerbi.extensibility.visual.IVisualHost;

export default class TextSearchFilterService implements FilterSink {
    constructor(private readonly host: IVisualHost) {}
    public apply(filter: WireFilter | null): void {
        this.host.applyJsonFilter(filter as unknown as Parameters<IVisualHost["applyJsonFilter"]>[0], "general", "filter", 0 /* FilterAction.merge */);
    }
    public clearFilter(): void { this.apply(null); }
}
