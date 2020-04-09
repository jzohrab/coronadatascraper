# coding: utf-8
# Finds all files in the cache containing russian characters.



cachedir = File.join(__dir__, '..', '..', 'coronadatascraper-cache')
files = []
Dir.chdir(cachedir) do
  files = Dir.glob(File.join('**', '*.*'))
end
all_files =
  files.
    map { |f| File.join("coronadatascraper-cache", f) }.
    uniq.
    sort


russian_chars = "населением"
russian_files =
  files.
    map { |f| File.join(cachedir, f) }.
    select { |f| f =~ /json$/ }.
    select { |f| File.read(f) =~ /[#{russian_chars}]/ }


puts russian_files

# Group by date.
