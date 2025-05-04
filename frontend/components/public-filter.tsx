"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { MapFilter } from "@/types"
import { getFilterOptions } from "@/lib/service-requests"

interface FilterOption {
  id: string
  name: string
}

interface FilterOptions {
  statuses: FilterOption[]
  departments: FilterOption[]
  requestTypes: FilterOption[]
}

interface PublicFilterProps {
  onFilterChange: (filter: MapFilter) => void
  initialFilter?: MapFilter
}

export function PublicFilter({ onFilterChange, initialFilter }: PublicFilterProps) {
  const [open, setOpen] = useState(false)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    statuses: [],
    departments: [],
    requestTypes: [],
  })

  // Initialize filter state from parent component's filter prop
  const [filter, setFilter] = useState<MapFilter>(initialFilter || {
    status: [],
    department: [],
    requestType: [],
  })

  // Load filter options from the API
  useEffect(() => {
    async function loadFilterOptions() {
      const options = await getFilterOptions()
      setFilterOptions(options)
    }

    loadFilterOptions()
  }, [])
  
  // Sync with parent's filter on mount (only once)
  useEffect(() => {
    onFilterChange(filter)
  }, [])

  const handleFilterChange = (type: keyof MapFilter, value: string) => {
    const newFilter = { ...filter }

    if (type === "status" || type === "department" || type === "requestType") {
      if (newFilter[type]?.includes(value)) {
        newFilter[type] = newFilter[type]?.filter((v) => v !== value)
      } else {
        newFilter[type] = [...(newFilter[type] || []), value]
      }
    }

    setFilter(newFilter)
    onFilterChange(newFilter)
  }

  const clearFilters = () => {
    setFilter({
      status: [],
      department: [],
      requestType: [],
    })
    onFilterChange({})
  }

  const getActiveFilterCount = () => {
    return (filter.status?.length || 0) + (filter.department?.length || 0) + (filter.requestType?.length || 0)
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2 items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="border-dashed">
              <span>Filter</span>
              {getActiveFilterCount() > 0 && (
                <Badge variant="info" className="ml-2">{getActiveFilterCount()}</Badge>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Status">
                  {filterOptions.statuses.map((status) => (
                    <CommandItem
                      key={status.id}
                      onSelect={() => handleFilterChange("status", status.id)}
                      className="flex items-center"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filter.status?.includes(status.id) ? "bg-primary text-primary-foreground" : "opacity-50",
                        )}
                      >
                        {filter.status?.includes(status.id) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{status.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandGroup heading="Department">
                  {filterOptions.departments.map((department) => (
                    <CommandItem
                      key={department.id}
                      onSelect={() => handleFilterChange("department", department.id)}
                      className="flex items-center"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filter.department?.includes(department.id)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50",
                        )}
                      >
                        {filter.department?.includes(department.id) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{department.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandGroup heading="Request Type">
                  {filterOptions.requestTypes.map((type) => (
                    <CommandItem
                      key={type.id}
                      onSelect={() => handleFilterChange("requestType", type.id)}
                      className="flex items-center"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filter.requestType?.includes(type.id) ? "bg-primary text-primary-foreground" : "opacity-50",
                        )}
                      >
                        {filter.requestType?.includes(type.id) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{type.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>

            {getActiveFilterCount() > 0 && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear filters
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Active filter badges */}
        <div className="flex flex-wrap gap-1">
          {filter.status?.map((statusId) => {
            const status = filterOptions.statuses.find((s) => s.id === statusId)
            return status ? (
              <Badge key={statusId} variant="secondary" className="flex items-center gap-1">
                {status.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("status", statusId)} />
              </Badge>
            ) : null
          })}

          {filter.department?.map((deptId) => {
            const dept = filterOptions.departments.find((d) => d.id === deptId)
            return dept ? (
              <Badge key={deptId} variant="secondary" className="flex items-center gap-1">
                {dept.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("department", deptId)} />
              </Badge>
            ) : null
          })}

          {filter.requestType?.map((typeId) => {
            const type = filterOptions.requestTypes.find((t) => t.id === typeId)
            return type ? (
              <Badge key={typeId} variant="secondary" className="flex items-center gap-1">
                {type.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("requestType", typeId)} />
              </Badge>
            ) : null
          })}
        </div>
      </div>
    </div>
  )
}
