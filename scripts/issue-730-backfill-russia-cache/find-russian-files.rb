# coding: utf-8
# Finds all files in the cache containing russian characters.

require 'digest/md5'

CACHEDIR = File.join(__dir__, '..', '..', 'coronadatascraper-cache')
files = []
russian_files = []

def make_hash(f)
  {
    fullpath: File.join(CACHEDIR, f),
    relpath: f,
    hexdigest: Digest::MD5.hexdigest(File.read(f))
  }
end


Dir.chdir(CACHEDIR) do
  files = Dir.glob(File.join('**', '*.*'))

  # Get the files and contents
  russian_chars = "населением"
  russian_files =
    files.
      select { |f| f =~ /json$/ }.
      select { |f| File.read(f) =~ /[#{russian_chars}]/ }.
      map { |f| make_hash(f) }
end

# example = russian_files[0].clone
# example.delete(:content)
# puts example


digests = russian_files.map { |hsh| hsh[:hexdigest] }.sort.uniq
puts "#{digests.count} digests, #{russian_files.count} files"

digests.each do |d|
  puts '-' * 40
  puts d
  puts russian_files.select { |r| r[:hexdigest] == d }
  puts
end
