import { BaseRecord, QueryParams } from "../types";

export function setQuery<T extends BaseRecord>(
  query: QueryParams<T> | undefined,
  searchParams: URLSearchParams
) {
  if (!query) return "";

  let { sort, expand, filter, page, perPage } = query;

  if (sort) {
    let sortQuery = Object.keys(sort)
      .map(
        (key) => `${sort![key as keyof typeof sort] === "+" ? "" : "-"}${key}`
      )
      .join(",");
    searchParams.append("sort", sortQuery);
  }

  if (expand) {
    searchParams.append("expand", expand.join(","));
  }

  if (filter) {
    searchParams.append("filter", `(${filter})`);
  }

  if (page || perPage) {
    searchParams.append("page", String(page));
    searchParams.append("perPage", String(perPage));
  } else {
    searchParams.append("page", "1");
    searchParams.append("perPage", String(999));
  }
}
