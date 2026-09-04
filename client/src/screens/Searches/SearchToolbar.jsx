import React from "react";
import { Box, Container, IconButton, Select, MenuItem, Stack, Typography } from "@mui/material";
import { Grid as GridIcon, List as ListIcon, SlidersHorizontal } from "lucide-react";

/**
 * Sticky toolbar under the hero: the server-side type filter, client-side
 * sort, the filter-drawer trigger, result count, and grid/list toggle — one
 * row on desktop, wraps naturally on mobile.
 */
export default function SearchToolbar({
  propertyTypeFilter,
  onTypeChange,
  sortBy,
  onSortChange,
  onOpenFilters,
  resultCount,
  viewMode,
  onViewModeChange,
}) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 64,
        zIndex: 5,
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 4, md: 6 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          spacing={3}
          sx={{ py: 3 }}
        >
          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap" useFlexGap>
            <Select
              size="small"
              displayEmpty
              value={propertyTypeFilter}
              onChange={(e) => onTypeChange(e.target.value)}
              sx={{ minWidth: 120, fontSize: 14 }}
            >
              <MenuItem value="">All types</MenuItem>
              <MenuItem value="rent">For rent</MenuItem>
              <MenuItem value="sale">For sale</MenuItem>
            </Select>

            <Select
              size="small"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              sx={{ minWidth: 150, fontSize: 14 }}
            >
              <MenuItem value="relevance">Most relevant</MenuItem>
              <MenuItem value="price-low">Price: low to high</MenuItem>
              <MenuItem value="price-high">Price: high to low</MenuItem>
              <MenuItem value="newest">Newest first</MenuItem>
            </Select>

            <IconButton
              onClick={onOpenFilters}
              aria-label="Open filters"
              sx={{
                borderRadius: 2,
                px: 3,
                gap: 2,
                width: "auto",
                backgroundColor: "secondary.main",
                color: "common.white",
                "&:hover": { backgroundColor: "secondary.dark" },
              }}
            >
              <SlidersHorizontal size={16} />
              <Typography variant="body2" sx={{ color: "inherit", fontWeight: 600 }}>
                Filter
              </Typography>
            </IconButton>

            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
              {resultCount} {resultCount === 1 ? "property" : "properties"}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ backgroundColor: "background.default", p: 1, borderRadius: 2 }}>
            <IconButton
              size="small"
              onClick={() => onViewModeChange("list")}
              sx={{
                borderRadius: 1.5,
                backgroundColor: viewMode === "list" ? "background.paper" : "transparent",
                color: viewMode === "list" ? "secondary.main" : "text.secondary",
              }}
            >
              <ListIcon size={16} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onViewModeChange("grid")}
              sx={{
                borderRadius: 1.5,
                backgroundColor: viewMode === "grid" ? "background.paper" : "transparent",
                color: viewMode === "grid" ? "secondary.main" : "text.secondary",
              }}
            >
              <GridIcon size={16} />
            </IconButton>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
