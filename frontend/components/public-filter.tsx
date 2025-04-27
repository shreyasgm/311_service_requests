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

interface PublicFilterProps {
  onFilterChange: (filter: MapFilter) => void
}

export function PublicFilter({ onFilterChange }: PublicFilterProps) {
  const [open, setOpen] = useState(false)
  const [filterOptions, setFilterOptions] = useState({
    statuses: [],
    departments: [],
    requestTypes: [],
  })

  const [filter, setFilter] = useState<MapFilter>({
    status: [],
    department: [],
    requestType: [],
  })

  useEffect(() => {
    async function loadFilterOptions() {
      const options = await getFilterOptions()
      setFilterOptions({
        statuses: options.statuses,
        departments: options.departments,
        requestTypes: options.requestTypes,
      })
    }

    loadFilterOptions()
  }, [])

  const handleFilterChange = (type: keyof MapFilter, value: string) => {
    setFilter((prev) => {
      const newFilter = { ...prev }

      if (type === "status" || type === "department" || type === "requestType") {
        if (newFilter[type]?.includes(value)) {
          newFilter[type] = newFilter[type]?.filter((v) => v !== value)
        } else {
          newFilter[type] = [...(newFilter[type] || []), value]
        }
      }

      onFilterChange(newFilter)
      return newFilter
    })
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
                <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">{getActiveFilterCount()}</Badge>
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
                      onSelect={() => handleFilterChange("status", status.name)}
                      className="flex items-center"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filter.status?.includes(status.name) ? "bg-primary text-primary-foreground" : "opacity-50",
                        )}
                      >
                        {filter.status?.includes(status.name) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{status.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandGroup heading="Department">
                  {filterOptions.departments.map((department) => (
                    <CommandItem
                      key={department.id}
                      onSelect={() => handleFilterChange("department", department.name)}
                      className="flex items-center"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filter.department?.includes(department.name)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50",
                        )}
                      >
                        {filter.department?.includes(department.name) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{department.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandGroup heading="Request Type">
                  {filterOptions.requestTypes.map((type) => (
                    <CommandItem
                      key={type.id}
                      onSelect={() => handleFilterChange("requestType", type.name)}
                      className="flex items-center"
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          filter.requestType?.includes(type.name) ? "bg-primary text-primary-foreground" : "opacity-50",
                        )}
                      >
                        {filter.requestType?.includes(type.name) && <Check className="h-3 w-3" />}
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
          {filter.status?.map((status) => (
            <Badge key={status} variant="secondary" className="flex items-center gap-1">
              {status}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("status", status)} />
            </Badge>
          ))}

          {filter.department?.map((dept) => (
            <Badge key={dept} variant="secondary" className="flex items-center gap-1">
              {dept}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("department", dept)} />
            </Badge>
          ))}

          {filter.requestType?.map((type) => (
            <Badge key={type} variant="secondary" className="flex items-center gap-1">
              {type}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("requestType", type)} />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
