# coding: utf-8
# Finds all files in the cache containing russian characters.

require 'digest/md5'

CACHEDIR = File.join(__dir__, '..', '..', 'coronadatascraper-cache')
files = []
russian_files = []

def make_hash(f)
  {
    fullpath: File.join(CACHEDIR, f),
    date: f.split('/')[0],
    relpath: f,
    hexdigest: Digest::MD5.hexdigest(File.read(f))
  }
end


Dir.chdir(CACHEDIR) do
  files = Dir.glob(File.join('**', '*.*'))

  russian_chars = "населением"
  files =
    files.
      select { |f| f =~ /json$/ }.
      select { |f| File.read(f) =~ /[#{russian_chars}]/ }.
      map { |f| make_hash(f) }
end

# example = files[0].clone
# example.delete(:content)
# puts example


digests = files.map { |hsh| hsh[:hexdigest] }.sort.uniq
puts "#{digests.count} digests, #{files.count} files"

puts "\n\nFILES GROUPED BY DIGESTS:"
digests.each do |d|
  puts '-' * 40
  puts d
  puts files.select { |r| r[:hexdigest] == d }
  puts
end

puts "\n\nDIGESTS GROUPED BY DATES:"
date_digests = {}
files.map { |f| f[:date] }.sort.uniq. each do |dt|
  date_digests[dt] = files.select { |f| f[:date] == dt }.map { |f| f[:hexdigest] }.sort.uniq
end
date_digests.each_key do |dt|
  puts "#{dt}: #{date_digests[dt]}"
end

puts "\n\nDATES WHERE EACH DIGEST IS FOUND"
dg_dates = {}
files.map { |f| f[:hexdigest] }.sort.uniq. each do |dg|
  dg_dates[dg] = files.select { |f| f[:hexdigest] == dg }.map { |f| f[:date] }.sort.uniq
end
dg_dates.each_key do |dg|
  dates = dg_dates[dg]
  raise "Digest #{dg} found in multiple dates #{dates}" if (dates.length != 1)
  puts "#{dg}: #{dates}"
end

puts "\n\nDATES WITH >1 DIGEST:"
check_dates = {}
date_digests.each_pair do |dt, dgs|
  if (dgs.size > 1) then
    check_dates[dt] = dgs
  end
end
puts "#{'md5'.ljust(35)}#{'#'.ljust(5)}#{'sample'.ljust(30)}"
check_dates.each_pair do |dt, dgs|
  puts "#{dt}:"
  dgs.each do |dg|
    all_files = files.select { |r| r[:hexdigest] == dg }
    puts "#{dg.ljust(35)}#{all_files.size.to_s.ljust(5)}#{all_files[0][:relpath].ljust(30)}"
  end
  puts
end

  
